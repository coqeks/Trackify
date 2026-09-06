import { useState, useEffect} from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { get_all_tracks, get_saved_purl } from '../../client/request'
import useAuth from '../../hooks/useAuth'

export const Route = createFileRoute('/_layout/')({
  component: Index
})

type TrackItem = {
  id : string;
  title : string;
  local_index : number;
  cloud_key : string;
  creator_id : number;
  created_at : Date;
}

function TrackRow({ trackTitle, date_created, duration }) {
  return (
    <div className='flex justify-between p-5 bg-gray-100'>
      <h1> {trackTitle} </h1>
      <div className='flex gap-20'>
        <h1> {date_created} </h1>
        <h1> Play Button </h1>
      </div>
    </div>
  )
}

function Index() {
  const { user: currentUser } = useAuth()
  const [ tracks, setTracks ] = useState<TrackItem[] | null>(null)

  useEffect(() => {
    const readTracks = async () => {
      const data = await get_all_tracks();
      console.log(data["Tracks"])
      setTracks(data["Tracks"] as TrackItem[]);
    }
    readTracks()
  }, [])

  useEffect(() => {
    console.log(typeof(tracks))
    const trackContainer = document.getElementById("TrackContainer") as HTMLDivElement
    for (let track in tracks) {
      console.log(track)
      // const trackElement = TrackRow({ track})
    }
  }, [tracks])

  return (
    <div className="flex flex-col gap-5">
      <div className="topbar justify-between">
        <div className="brand">Your Tracks</div>
        <div className="border hover:bg-gray-200"><Link to="/audio">start uploading</Link></div>
      </div>
      <h3>Welcome Home!, { currentUser?.full_name }</h3>
      <div id="TrackContainer">

      </div>
      {tracks instanceof Array && 
        <div className="flex flex-col gap-3">
          {tracks.map((track) => (
            <TrackRow trackTitle={track.title} date_created={track.created_at} duration={"idk"}></TrackRow>
          ))}
        </div>
      }
    </div>
  )
}