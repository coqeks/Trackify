"""
@file:       analysis.py
@summary:    Musical key and tempo (BPM) detection, run on the stems demucs produces.
             Pure numpy so it adds no heavy dependencies to the worker.
"""

from pathlib import Path

import numpy as np
from pydub import AudioSegment

ANALYSIS_SR = 22050
KEY_HOP = 2048
ONSET_HOP = 256
BLOCK_FRAMES = 256      # STFT frames processed at once, keeps memory flat for long songs

PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Krumhansl-Kessler key profiles
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

MIN_BPM, MAX_BPM = 60.0, 200.0
COMB_HARMONICS = 4
ONSET_BANDS = 40
SILENCE_RMS = 1e-3

RHYTHM_STEMS = ["drums", "bass"]
HARMONIC_STEMS = ["bass", "guitar", "piano", "other", "vocals"]


def _load_mono(path: Path) -> tuple[np.ndarray, int]:
    """Read an audio file as mono float32 in [-1, 1]."""
    seg = AudioSegment.from_file(path)
    samples = np.array(seg.get_array_of_samples(), dtype=np.float32)
    samples /= float(1 << (8 * seg.sample_width - 1))
    if seg.channels > 1:
        samples = samples.reshape(-1, seg.channels).mean(axis=1)
    return samples, seg.frame_rate


def _resample(y: np.ndarray, sr: int, target_sr: int) -> np.ndarray:
    """Crude resample: integer decimation with box anti-aliasing, else linear interpolation.
    Plenty accurate for key/tempo estimation."""
    if sr == target_sr:
        return y
    if sr % target_sr == 0:
        factor = sr // target_sr
        n = len(y) // factor * factor
        return y[:n].reshape(-1, factor).mean(axis=1)
    duration = len(y) / sr
    t_new = np.arange(int(duration * target_sr)) / target_sr
    return np.interp(t_new, np.arange(len(y)) / sr, y).astype(np.float32)


def _mix_stems(stem_dir: Path, names: list[str]) -> np.ndarray | None:
    """Sum the named stems (those that exist and aren't silent) into one mono signal."""
    mix = None
    for name in names:
        path = stem_dir / f"{name}.wav"
        if not path.exists():
            continue
        y, sr = _load_mono(path)
        y = _resample(y, sr, ANALYSIS_SR)
        if y.size == 0 or np.sqrt(np.mean(y ** 2)) < SILENCE_RMS:
            continue
        if mix is None:
            mix = y
        else:
            n = min(len(mix), len(y))
            mix = mix[:n] + y[:n]
    return mix


def _stft_blocks(y: np.ndarray, n_fft: int, hop: int):
    """Yield magnitude spectrogram blocks of shape (frames, n_fft // 2 + 1)."""
    window = np.hanning(n_fft).astype(np.float32)
    n_frames = 1 + max(0, len(y) - n_fft) // hop
    for start in range(0, n_frames, BLOCK_FRAMES):
        stop = min(start + BLOCK_FRAMES, n_frames)
        idx = np.arange(start, stop)[:, None] * hop + np.arange(n_fft)[None, :]
        yield np.abs(np.fft.rfft(y[idx] * window, axis=1))


def detect_key(y: np.ndarray) -> str | None:
    n_fft = 8192
    freqs = np.fft.rfftfreq(n_fft, 1 / ANALYSIS_SR)
    band = (freqs >= 55) & (freqs <= 2000)
    pitch_class = (np.round(12 * np.log2(freqs[band] / 440.0)).astype(int) + 9) % 12

    chroma = np.zeros(12)
    for mag in _stft_blocks(y, n_fft, KEY_HOP):
        frame_chroma = np.zeros((mag.shape[0], 12))
        for pc in range(12):
            frame_chroma[:, pc] = mag[:, band][:, pitch_class == pc].sum(axis=1)
        # Normalise each frame so loud passages don't dominate the estimate
        norms = frame_chroma.max(axis=1, keepdims=True)
        chroma += (frame_chroma / np.where(norms > 0, norms, 1)).sum(axis=0)

    if not chroma.any():
        return None

    best_score, best_key = -np.inf, None
    for tonic in range(12):
        for profile, mode in ((MAJOR_PROFILE, "major"), (MINOR_PROFILE, "minor")):
            score = np.corrcoef(chroma, np.roll(profile, tonic))[0, 1]
            if score > best_score:
                best_score, best_key = score, f"{PITCH_CLASSES[tonic]} {mode}"
    return best_key


def detect_bpm(y: np.ndarray) -> float | None:
    n_fft = 2048
    # Pool linear FFT bins into log-spaced bands so a kick (a few low bins) weighs
    # as much as a hi-hat (hundreds of high bins)
    freqs = np.fft.rfftfreq(n_fft, 1 / ANALYSIS_SR)
    edges = np.geomspace(30, ANALYSIS_SR / 2, ONSET_BANDS + 1)
    band_of_bin = np.digitize(freqs, edges) - 1
    valid = (band_of_bin >= 0) & (band_of_bin < ONSET_BANDS)
    pool = np.zeros((len(freqs), ONSET_BANDS), dtype=np.float32)
    pool[np.nonzero(valid)[0], band_of_bin[valid]] = 1
    pool /= np.maximum(pool.sum(axis=0), 1)

    # Onset strength: half-wave rectified spectral flux of log band energy
    flux, prev = [], None
    for mag in _stft_blocks(y, n_fft, ONSET_HOP):
        log_mag = np.log1p(100 * (mag @ pool))
        if prev is not None:
            log_mag = np.vstack([prev, log_mag])
        flux.append(np.maximum(np.diff(log_mag, axis=0), 0).sum(axis=1))
        prev = log_mag[-1:]
    if not flux:
        return None
    onset = np.concatenate(flux)
    onset -= onset.mean()

    fps = ANALYSIS_SR / ONSET_HOP
    min_lag = int(np.floor(60 * fps / MAX_BPM))
    max_lag = int(np.ceil(60 * fps / MIN_BPM))
    if len(onset) <= COMB_HARMONICS * max_lag * 2:
        return None

    # FFT-based autocorrelation
    size = 1 << int(np.ceil(np.log2(2 * len(onset))))
    spectrum = np.fft.rfft(onset, size)
    acf = np.fft.irfft(spectrum * np.conj(spectrum))[: COMB_HARMONICS * (max_lag + 1) + COMB_HARMONICS]

    # Comb score: a true beat period also lines up at 2x, 3x, 4x its lag, while
    # sub-beat periodicities (e.g. hi-hats at 3 eighths) don't. Take the local max
    # around each multiple to tolerate fractional periods.
    lags = np.arange(min_lag, max_lag + 1)
    comb = np.zeros(len(lags))
    for k in range(1, COMB_HARMONICS + 1):
        r = k // 2
        comb += np.max([acf[k * lags + d] for d in range(-r, r + 1)], axis=0)
    comb /= COMB_HARMONICS

    bpms = 60 * fps / lags
    # Log-normal prior around 120 BPM resolves half/double tempo ambiguity
    prior = np.exp(-0.5 * (np.log2(bpms / 120.0) / 1.0) ** 2)
    scores = comb * prior
    i = int(np.argmax(scores))
    if comb[i] <= 0:
        return None

    # Parabolic interpolation on the raw autocorrelation for sub-frame precision
    lag = float(lags[i])
    a, b, c = acf[lags[i] - 1], acf[lags[i]], acf[lags[i] + 1]
    denom = a - 2 * b + c
    if denom != 0:
        lag += 0.5 * (a - c) / denom
    return round(float(60 * fps / lag), 1)


def analyze_stems(stem_dir: Path) -> dict:
    """Estimate key and BPM from a demucs output directory.
    Tempo uses the rhythm section (falls back to the harmonic stems if drums/bass are silent);
    key uses the harmonic stems so drums don't smear the chroma."""
    rhythm = _mix_stems(stem_dir, RHYTHM_STEMS)
    harmonic = _mix_stems(stem_dir, HARMONIC_STEMS)
    if rhythm is None:
        rhythm = harmonic

    return {
        "musical_key": detect_key(harmonic) if harmonic is not None else None,
        "bpm": detect_bpm(rhythm) if rhythm is not None else None,
    }
