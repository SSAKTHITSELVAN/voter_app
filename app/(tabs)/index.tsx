import { Redirect } from 'expo-router';

// The old dashboard is no longer needed.
// Redirect any direct hits on "/" to the Nearby (households) screen.
export default function Index() {
  return <Redirect href="/households" />;
}