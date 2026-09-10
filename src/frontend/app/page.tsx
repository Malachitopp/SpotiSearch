type Release = {
  artist: string;
  release_date: string|null;
  title: string;
}
export default async function Home(
  {searchParams,}:{searchParams: Promise<{user?:string}>;
})
 {
  const {user } = await searchParams;
  if (!user) {
    return <a href = "http://127.0.0.1:3001/login"> Connect Spotify</a>;
  }
  
  const res = await fetch("http://localhost:3001/releases/upcoming", {
    cache: "no-store" });
  const releases = await res.json() 


  return (
    <ul>
      {releases.map((r: Release) => (
        <li key = {r.title}> {r.release_date} - {r.artist} - {r.title}</li>
      ))}
    </ul>
  );
} 