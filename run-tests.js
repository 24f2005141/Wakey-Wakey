// Basic mock tests for logic boundaries
const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3;
  const p1 = lat1 * Math.PI/180;
  const p2 = lat2 * Math.PI/180;
  const dp = (lat2-lat1) * Math.PI/180;
  const dl = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Check if trigger logic would fire immediately incorrectly 
const userLoc = { lat: 37.7749, lng: -122.4194 };
const alarmLoc = { lat: 37.7750, lng: -122.4194 };
const dist = getDistanceInMeters(userLoc.lat, userLoc.lng, alarmLoc.lat, alarmLoc.lng);
console.log("Distance test: ", dist);
if (dist < 100) {
  console.log("Alarm would trigger!");
}

