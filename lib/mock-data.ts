export type TrackSource = "youtube" | "soundcloud" | "mp3"
export type RequestPolicy = "closed" | "open" | "approval"
export type ChatMessageType = "message" | "request" | "announcement" | "activity_join" | "activity_tip"

export interface Track {
  id: string
  title: string
  artist: string
  duration: number // seconds
  source: TrackSource
  sourceUrl: string
  submittedBy: string
  albumGradient: string // CSS gradient for placeholder art
  infoSnippet?: string // optional admin-authored blurb shown to listeners
}

export interface ChatMessage {
  id: string
  username: string
  avatarColor: string
  message: string
  timestamp: Date
  type: ChatMessageType
  mediaUrl?: string
  mediaType?: string
}

export interface Room {
  id: string
  slug: string
  name: string
  description: string
  djName: string
  djUsername: string
  djAvatarColor: string
  creatorUserId?: string
  coverGradient: string
  genre: string
  isLive: boolean
  listenerCount: number
  isOfficial: boolean
  requestPolicy: RequestPolicy
  nowPlaying: Track
  queue: Track[]
  chatMessages: ChatMessage[]
  vibes: string[] // Up to 3 DJ-selected mood/vibe tags
  coverArt?: string // Optional uploaded artwork URL/data-URL
  scheduledStart?: Date // For upcoming shows
  lastActive?: Date // For recently active rooms
  endedAt?: Date // When the session was ended
  isFeatured?: boolean // Admin-selected featured room
  isAutoplay?: boolean // 24/7 autoplay room
}

export interface DJ {
  username: string
  displayName: string
  avatarColor: string
  bio: string
  totalListeners: number
  roomsHosted: number
  hoursStreamed: number
  followerCount: number
  currentRoom: string | null
}

export interface User {
  id: string
  username: string
  displayName: string
  email: string
  avatarColor: string
  avatarUrl?: string
  location: {
    city?: string
    state: string
    country: string
  }
  accountType: "free" | "premium"
  joinDate: Date
  stats: {
    totalListenTime: number // minutes
    roomsVisited: number
    tracksListened: number
  }
}

export interface FavoriteTrack {
  track: Track
  listenTime: number // minutes
}

export interface FavoriteRoom {
  room: Room
  listenTime: number // minutes
  visitCount: number
}

export interface FavoriteDJ {
  dj: DJ
  listenTime: number // minutes
}

export const genres = [
  "Lo-fi",
  "Hip-Hop",
  "Jazz",
  "Electronic",
  "Indie",
  "R&B",
  "House",
  "Ambient",
  "Soul",
  "Funk",
  "Rock",
  "Pop",
]

export const vibeOptions = [
  "Late Night",
  "Chill",
  "Hype",
  "Throwbacks",
  "Deep Cuts",
  "Feel Good",
  "Moody",
  "Party",
  "Focus",
  "Workout",
  "Road Trip",
  "Sunday Morning",
  "Underground",
  "Soulful",
  "Experimental",
  "Groovy",
  "Mellow",
  "Energetic",
]

const gradients = [
  "linear-gradient(135deg, oklch(0.45 0.15 30), oklch(0.35 0.20 350))",
  "linear-gradient(135deg, oklch(0.40 0.18 250), oklch(0.30 0.15 280))",
  "linear-gradient(135deg, oklch(0.50 0.12 150), oklch(0.35 0.18 180))",
  "linear-gradient(135deg, oklch(0.55 0.20 80), oklch(0.40 0.22 50))",
  "linear-gradient(135deg, oklch(0.45 0.22 320), oklch(0.30 0.15 280))",
  "linear-gradient(135deg, oklch(0.50 0.15 200), oklch(0.35 0.12 230))",
  "linear-gradient(135deg, oklch(0.40 0.10 100), oklch(0.55 0.15 130))",
  "linear-gradient(135deg, oklch(0.50 0.20 350), oklch(0.40 0.18 20))",
]

export const coverGradients = [
  "linear-gradient(160deg, oklch(0.25 0.08 30), oklch(0.15 0.12 350))",
  "linear-gradient(160deg, oklch(0.20 0.10 250), oklch(0.12 0.08 280))",
  "linear-gradient(160deg, oklch(0.30 0.06 150), oklch(0.15 0.10 180))",
  "linear-gradient(160deg, oklch(0.28 0.12 80), oklch(0.18 0.14 50))",
  "linear-gradient(160deg, oklch(0.22 0.14 320), oklch(0.14 0.10 280))",
  "linear-gradient(160deg, oklch(0.25 0.08 200), oklch(0.15 0.06 230))",
  "linear-gradient(160deg, oklch(0.20 0.06 100), oklch(0.30 0.08 130))",
  "linear-gradient(160deg, oklch(0.28 0.12 350), oklch(0.20 0.10 20))",
]

export const avatarColors = [
  "oklch(0.70 0.18 30)",
  "oklch(0.65 0.20 250)",
  "oklch(0.72 0.15 150)",
  "oklch(0.68 0.22 80)",
  "oklch(0.60 0.18 320)",
  "oklch(0.75 0.12 200)",
]

export function createTrack(id: string, title: string, artist: string, duration: number, source: TrackSource, submittedBy: string, gradientIndex: number): Track {
  return {
    id,
    title,
    artist,
    duration,
    source,
    sourceUrl: "#",
    submittedBy,
    albumGradient: gradients[gradientIndex % gradients.length],
  }
}

function createChatMessage(id: string, username: string, message: string, minutesAgo: number, type: ChatMessageType, colorIndex: number): ChatMessage {
  return {
    id,
    username,
    avatarColor: avatarColors[colorIndex % avatarColors.length],
    message,
    timestamp: new Date(Date.now() - minutesAgo * 60000),
    type,
  }
}

export const rooms: Room[] = [
  {
    id: "1",
    slug: "midnight-frequencies",
    name: "Midnight Frequencies",
    description: "Late-night electronic vibes to keep you moving. Deep house, techno, and everything in between.",
    djName: "DJ Lumina",
    djUsername: "djlumina",
    djAvatarColor: avatarColors[0],
    coverGradient: coverGradients[0],
    coverArt: "/images/cover-midnight-frequencies.jpg",
    genre: "Electronic",
    vibes: ["Late Night", "Deep Cuts", "Moody"],
    isLive: true,
    listenerCount: 342,
    isOfficial: true,
    requestPolicy: "approval",
    nowPlaying: createTrack("t1", "Neon Pulse", "Synthwave Collective", 245, "youtube", "DJ Lumina", 0),
    queue: [
      createTrack("t2", "Digital Rain", "ChromaKey", 198, "soundcloud", "DJ Lumina", 1),
      createTrack("t3", "After Hours", "Midnight Sun", 320, "youtube", "listener_42", 2),
      createTrack("t4", "Voltage", "Circuit Breaker", 275, "mp3", "DJ Lumina", 3),
    ],
    chatMessages: [
      createChatMessage("c1", "NightOwl", "This track is insane", 5, "message", 0),
      createChatMessage("c2", "DJ Lumina", "Welcome to Midnight Frequencies! We're going deep tonight.", 4, "announcement", 1),
      createChatMessage("c3", "BassDrop99", "Can you play some Aphex Twin?", 3, "request", 2),
      createChatMessage("c4", "SynthLover", "The vibes are immaculate right now", 2, "message", 3),
      createChatMessage("c5", "EchoVault", "First time here, this is amazing", 1, "message", 4),
    ],
  },
  {
    id: "2",
    slug: "jazz-after-dark",
    name: "Jazz After Dark",
    description: "Smooth jazz and neo-soul for the discerning ear. Curated classics and modern gems.",
    djName: "Miles Deep",
    djUsername: "milesdeep",
    djAvatarColor: avatarColors[1],
    coverGradient: coverGradients[1],
    coverArt: "/images/cover-jazz-after-dark.jpg",
    genre: "Jazz",
    vibes: ["Chill", "Soulful", "Late Night"],
    isLive: true,
    listenerCount: 187,
    isOfficial: true,
    requestPolicy: "open",
    nowPlaying: createTrack("t5", "Blue in Green (Live)", "Kamasi Washington", 412, "youtube", "Miles Deep", 4),
    queue: [
      createTrack("t6", "Maiden Voyage", "Herbie Hancock", 310, "youtube", "Miles Deep", 5),
      createTrack("t7", "Lingus", "Snarky Puppy", 620, "soundcloud", "jazzcat22", 6),
    ],
    chatMessages: [
      createChatMessage("c6", "SmoothKeys", "Kamasi always delivers", 8, "message", 1),
      createChatMessage("c7", "Miles Deep", "Thursday night jazz session is a go. Settle in.", 6, "announcement", 2),
      createChatMessage("c8", "VelvetTone", "This is my therapy session", 3, "message", 3),
    ],
  },
  {
    id: "3",
    slug: "lofi-study-room",
    name: "Lo-fi Study Room",
    description: "Chill beats to study and relax to. 24/7 lo-fi hip hop vibes.",
    djName: "ChillBot",
    djUsername: "chillbot",
    djAvatarColor: avatarColors[2],
    coverGradient: coverGradients[2],
    genre: "Lo-fi",
    vibes: ["Focus", "Chill", "Mellow"],
    isLive: true,
    listenerCount: 1247,
    isOfficial: false,
    requestPolicy: "open",
    nowPlaying: createTrack("t8", "Rainy Afternoon", "Idealism", 185, "soundcloud", "ChillBot", 2),
    queue: [
      createTrack("t9", "Snowflake", "Tomppabeats", 142, "youtube", "studymode", 3),
      createTrack("t10", "Coffee", "Beagle Kick", 175, "soundcloud", "ChillBot", 4),
      createTrack("t11", "Feather", "Nujabes", 325, "youtube", "vinylhead", 5),
      createTrack("t12", "Shiki no Uta", "MINMI", 262, "youtube", "ChillBot", 6),
    ],
    chatMessages: [
      createChatMessage("c9", "StudyMode", "Perfect study vibes as always", 15, "message", 0),
      createChatMessage("c10", "ChillBot", "Welcome back everyone. Let the beats flow.", 12, "announcement", 2),
      createChatMessage("c11", "RainyDay", "Can someone recommend similar artists?", 5, "message", 4),
      createChatMessage("c12", "LofiLover", "Nujabes would go hard right now", 2, "request", 5),
    ],
  },
  {
    id: "4",
    slug: "soul-kitchen",
    name: "Soul Kitchen",
    description: "Classic soul, Motown, and R&B. Where the music feeds your soul.",
    djName: "Vinyl Queen",
    djUsername: "vinylqueen",
    djAvatarColor: avatarColors[3],
    coverGradient: coverGradients[3],
    genre: "Soul",
    vibes: ["Throwbacks", "Soulful", "Feel Good"],
    isLive: true,
    listenerCount: 89,
    isOfficial: false,
    requestPolicy: "closed",
    nowPlaying: createTrack("t13", "Ain't No Sunshine", "Bill Withers", 125, "youtube", "Vinyl Queen", 7),
    queue: [
      createTrack("t14", "Sittin' on the Dock of the Bay", "Otis Redding", 165, "youtube", "Vinyl Queen", 0),
      createTrack("t15", "Superstition", "Stevie Wonder", 245, "youtube", "Vinyl Queen", 1),
    ],
    chatMessages: [
      createChatMessage("c13", "SoulSister", "Bill Withers never misses", 4, "message", 3),
      createChatMessage("c14", "Vinyl Queen", "Tonight we're going all the way back. Classic soul only.", 3, "announcement", 4),
    ],
  },
  {
    id: "5",
    slug: "hip-hop-cypher",
    name: "Hip-Hop Cypher",
    description: "Underground and classic hip-hop. From boom bap to trap, we cover it all.",
    djName: "MC Flow",
    djUsername: "mcflow",
    djAvatarColor: avatarColors[4],
    coverGradient: coverGradients[4],
    genre: "Hip-Hop",
    vibes: ["Underground", "Throwbacks", "Hype"],
    isLive: true,
    listenerCount: 456,
    isOfficial: true,
    requestPolicy: "approval",
    nowPlaying: createTrack("t16", "N.Y. State of Mind", "Nas", 292, "youtube", "MC Flow", 3),
    queue: [
      createTrack("t17", "C.R.E.A.M.", "Wu-Tang Clan", 250, "youtube", "MC Flow", 4),
      createTrack("t18", "Alright", "Kendrick Lamar", 219, "soundcloud", "beathead", 5),
      createTrack("t19", "Electric Relaxation", "A Tribe Called Quest", 247, "youtube", "MC Flow", 6),
    ],
    chatMessages: [
      createChatMessage("c15", "BoomBap", "Nas is the GOAT, no debate", 6, "message", 0),
      createChatMessage("c16", "MC Flow", "Friday night cypher! Requests open for approved tracks.", 5, "announcement", 1),
      createChatMessage("c17", "RhymeTime", "Play some MF DOOM!", 3, "request", 2),
      createChatMessage("c18", "VibeCheck", "The transition from last track was smooth", 1, "message", 5),
    ],
  },
  {
    id: "6",
    slug: "indie-discovery",
    name: "Indie Discovery",
    description: "Unearthing hidden indie gems before they blow up. Guitar-driven, dreamy, authentic.",
    djName: "SarahSounds",
    djUsername: "sarahsounds",
    djAvatarColor: avatarColors[5],
    coverGradient: coverGradients[5],
    genre: "Indie",
    vibes: ["Deep Cuts", "Mellow", "Experimental"],
    isLive: false,
    listenerCount: 0,
    isOfficial: false,
    requestPolicy: "open",
    nowPlaying: createTrack("t20", "Motion Sickness", "Phoebe Bridgers", 230, "youtube", "SarahSounds", 1),
    queue: [],
    chatMessages: [],
    lastActive: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
  },
  {
    id: "7",
    slug: "house-of-groove",
    name: "House of Groove",
    description: "Deep house, tech house, and funky grooves to get you moving.",
    djName: "GrooveMaster",
    djUsername: "groovemaster",
    djAvatarColor: avatarColors[0],
    coverGradient: coverGradients[6],
    genre: "House",
    vibes: ["Groovy", "Party", "Energetic"],
    isLive: true,
    listenerCount: 215,
    isOfficial: true,
    requestPolicy: "closed",
    nowPlaying: createTrack("t21", "Cola", "CamelPhat & Elderbrook", 255, "soundcloud", "GrooveMaster", 7),
    queue: [
      createTrack("t22", "Losing It", "Fisher", 183, "youtube", "GrooveMaster", 0),
      createTrack("t23", "French Kiss", "Lil Louis", 480, "youtube", "GrooveMaster", 1),
    ],
    chatMessages: [
      createChatMessage("c19", "HouseHead", "This room always has the best selection", 7, "message", 2),
      createChatMessage("c20", "GrooveMaster", "House music all night long. Let's groove.", 5, "announcement", 3),
      createChatMessage("c21", "DanceFloor", "My neighbors are not gonna be happy tonight", 2, "message", 4),
    ],
  },
  {
    id: "8",
    slug: "ambient-escape",
    name: "Ambient Escape",
    description: "Ambient soundscapes for relaxation, meditation, and deep focus.",
    djName: "Ethereal",
    djUsername: "ethereal",
    djAvatarColor: avatarColors[1],
    coverGradient: coverGradients[7],
    genre: "Ambient",
    vibes: ["Focus", "Chill", "Experimental"],
    isLive: true,
    listenerCount: 73,
    isOfficial: false,
    requestPolicy: "open",
    nowPlaying: createTrack("t24", "Weightless", "Marconi Union", 480, "youtube", "Ethereal", 5),
    queue: [
      createTrack("t25", "An Ending (Ascent)", "Brian Eno", 264, "youtube", "Ethereal", 6),
    ],
    chatMessages: [
      createChatMessage("c22", "ZenMind", "This is exactly what I needed tonight", 10, "message", 5),
      createChatMessage("c23", "Ethereal", "Welcome to the escape. Breathe and let go.", 8, "announcement", 0),
    ],
  },
  {
    id: "9",
    slug: "morning-jazz-brunch",
    name: "Morning Jazz Brunch",
    description: "Sunday morning jazz to start your day right. Coffee and smooth melodies.",
    djName: "Miles Deep",
    djUsername: "milesdeep",
    djAvatarColor: avatarColors[1],
    coverGradient: coverGradients[1],
    genre: "Jazz",
    vibes: ["Sunday Morning", "Chill", "Feel Good"],
    isLive: false,
    listenerCount: 0,
    isOfficial: true,
    requestPolicy: "closed",
    nowPlaying: createTrack("t26", "Take Five", "Dave Brubeck", 324, "youtube", "Miles Deep", 1),
    queue: [],
    chatMessages: [],
    scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000), // Starts in 2 hours
  },
  {
    id: "10",
    slug: "techno-after-hours",
    name: "Techno After Hours",
    description: "Raw techno for the late night crowd. Hard-hitting beats and hypnotic rhythms.",
    djName: "Pulse",
    djUsername: "pulse",
    djAvatarColor: avatarColors[4],
    coverGradient: coverGradients[0],
    genre: "Electronic",
    vibes: ["Late Night", "Underground", "Energetic"],
    isLive: false,
    listenerCount: 0,
    isOfficial: true,
    requestPolicy: "closed",
    nowPlaying: createTrack("t27", "Spastik", "Plastikman", 395, "soundcloud", "Pulse", 2),
    queue: [],
    chatMessages: [],
    scheduledStart: new Date(Date.now() + 5 * 60 * 60 * 1000), // Starts in 5 hours
  },
  {
    id: "11",
    slug: "r-and-b-nights",
    name: "R&B Nights",
    description: "Smooth R&B and neo-soul vibes. From classics to modern heat.",
    djName: "VelvetVoice",
    djUsername: "velvetvoice",
    djAvatarColor: avatarColors[3],
    coverGradient: coverGradients[3],
    genre: "R&B",
    vibes: ["Soulful", "Moody", "Late Night"],
    isLive: false,
    listenerCount: 0,
    isOfficial: false,
    requestPolicy: "open",
    nowPlaying: createTrack("t28", "Cranes in the Sky", "Solange", 206, "youtube", "VelvetVoice", 3),
    queue: [],
    chatMessages: [],
    lastActive: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
  },
]

export const djs: DJ[] = [
  {
    username: "djlumina",
    displayName: "DJ Lumina",
    avatarColor: avatarColors[0],
    bio: "Electronic music curator spinning deep house, techno, and experimental beats since 2019. Building sonic journeys one track at a time.",
    totalListeners: 45200,
    roomsHosted: 312,
    hoursStreamed: 1480,
    followerCount: 8900,
    currentRoom: "midnight-frequencies",
  },
  {
    username: "milesdeep",
    displayName: "Miles Deep",
    avatarColor: avatarColors[1],
    bio: "Jazz head and vinyl collector. If it swings, grooves, or improvises, it belongs in my room.",
    totalListeners: 28400,
    roomsHosted: 198,
    hoursStreamed: 920,
    followerCount: 5600,
    currentRoom: "jazz-after-dark",
  },
  {
    username: "chillbot",
    displayName: "ChillBot",
    avatarColor: avatarColors[2],
    bio: "Your friendly lo-fi curator. Beats to relax, study, and vibe to.",
    totalListeners: 120000,
    roomsHosted: 1500,
    hoursStreamed: 8760,
    followerCount: 24300,
    currentRoom: "lofi-study-room",
  },
  {
    username: "vinylqueen",
    displayName: "Vinyl Queen",
    avatarColor: avatarColors[3],
    bio: "Classic soul and R&B purist. Every track is hand-picked from my vinyl collection.",
    totalListeners: 15800,
    roomsHosted: 87,
    hoursStreamed: 430,
    followerCount: 3200,
    currentRoom: "soul-kitchen",
  },
  {
    username: "mcflow",
    displayName: "MC Flow",
    avatarColor: avatarColors[4],
    bio: "Hip-hop historian and lyrical purist. Underground to mainstream, boom bap to trap.",
    totalListeners: 67000,
    roomsHosted: 245,
    hoursStreamed: 1100,
    followerCount: 12400,
    currentRoom: "hip-hop-cypher",
  },
  {
    username: "groovemaster",
    displayName: "GrooveMaster",
    avatarColor: avatarColors[0],
    bio: "House music is a feeling. Deep, tech, funky — if it grooves, I play it.",
    totalListeners: 38900,
    roomsHosted: 156,
    hoursStreamed: 780,
    followerCount: 7100,
    currentRoom: "house-of-groove",
  },
]

export function getRoomBySlug(slug: string): Room | undefined {
  return rooms.find((r) => r.slug === slug)
}

export function getDJByUsername(username: string): DJ | undefined {
  return djs.find((d) => d.username === username)
}

export function getLiveRooms(): Room[] {
  return rooms.filter((r) => r.isLive)
}

export function getUpcomingRooms(): Room[] {
  return rooms
    .filter((r) => r.scheduledStart && !r.isLive)
    .sort((a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime())
}

export function getRecentlyActiveRooms(): Room[] {
  return rooms
    .filter((r) => !r.isLive && r.lastActive)
    .sort((a, b) => b.lastActive!.getTime() - a.lastActive!.getTime())
}

export function getOfficialRooms(): Room[] {
  return rooms.filter((r) => r.isOfficial)
}

export function getRoomsByGenre(genre: string): Room[] {
  return rooms.filter((r) => r.genre === genre)
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function formatListenerCount(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`
  }
  return count.toString()
}

// Current logged-in user
export const currentUser: User = {
  id: "user-1",
  username: "musiclover42",
  displayName: "Music Lover",
  email: "musiclover@example.com",
  avatarColor: avatarColors[3],
  location: {
    city: "San Francisco",
    state: "California",
    country: "United States",
  },
  accountType: "free",
  joinDate: new Date("2024-03-15"),
  stats: {
    totalListenTime: 3840, // 64 hours
    roomsVisited: 18,
    tracksListened: 427,
  },
}

// Chat user profiles -- lightweight profiles for usernames appearing in chat
export interface ChatUser {
  username: string
  displayName: string
  avatarColor: string
  bio: string
  joinDate: string // e.g. "Mar 2024"
  listenHours: number
}

const chatUsers: ChatUser[] = [
  { username: "NightOwl", displayName: "Night Owl", avatarColor: avatarColors[0], bio: "Late night listener. Electronic & ambient.", joinDate: "Jan 2024", listenHours: 312 },
  { username: "BassDrop99", displayName: "BassDrop", avatarColor: avatarColors[2], bio: "Bass music enthusiast. Dubstep & DnB.", joinDate: "Nov 2023", listenHours: 540 },
  { username: "SynthLover", displayName: "Synth Lover", avatarColor: avatarColors[3], bio: "Synthwave is life.", joinDate: "Feb 2024", listenHours: 198 },
  { username: "EchoVault", displayName: "Echo Vault", avatarColor: avatarColors[4], bio: "Discovering new sounds every day.", joinDate: "Jun 2024", listenHours: 87 },
  { username: "SmoothKeys", displayName: "Smooth Keys", avatarColor: avatarColors[1], bio: "Jazz keys and smooth vibes.", joinDate: "Apr 2023", listenHours: 720 },
  { username: "VelvetTone", displayName: "Velvet Tone", avatarColor: avatarColors[3], bio: "Analog warmth in a digital world.", joinDate: "Dec 2023", listenHours: 445 },
  { username: "StudyMode", displayName: "Study Mode", avatarColor: avatarColors[0], bio: "Lo-fi beats to study to.", joinDate: "Sep 2023", listenHours: 890 },
  { username: "RainyDay", displayName: "Rainy Day", avatarColor: avatarColors[4], bio: "Rainy day playlists.", joinDate: "May 2024", listenHours: 156 },
  { username: "LofiLover", displayName: "Lofi Lover", avatarColor: avatarColors[5], bio: "Nujabes changed my life.", joinDate: "Jul 2023", listenHours: 1020 },
  { username: "SoulSister", displayName: "Soul Sister", avatarColor: avatarColors[3], bio: "Classic soul & R&B.", joinDate: "Oct 2023", listenHours: 612 },
  { username: "BoomBap", displayName: "Boom Bap", avatarColor: avatarColors[0], bio: "90s hip-hop head.", joinDate: "Aug 2023", listenHours: 780 },
  { username: "RhymeTime", displayName: "Rhyme Time", avatarColor: avatarColors[2], bio: "Bars over beats.", joinDate: "Mar 2024", listenHours: 345 },
  { username: "VibeCheck", displayName: "Vibe Check", avatarColor: avatarColors[5], bio: "If the vibes are right, I'm here.", joinDate: "Jan 2025", listenHours: 67 },
  { username: "HouseHead", displayName: "House Head", avatarColor: avatarColors[2], bio: "House music all night.", joinDate: "Feb 2023", listenHours: 1340 },
  { username: "DanceFloor", displayName: "Dance Floor", avatarColor: avatarColors[4], bio: "Dancing alone in my apartment.", joinDate: "Nov 2024", listenHours: 230 },
  { username: "ZenMind", displayName: "Zen Mind", avatarColor: avatarColors[5], bio: "Ambient & meditation.", joinDate: "Jun 2023", listenHours: 950 },
  { username: "MusicFan42", displayName: "Music Fan", avatarColor: avatarColors[0], bio: "A little bit of everything.", joinDate: "Apr 2024", listenHours: 420 },
  { username: "ChillVibes", displayName: "Chill Vibes", avatarColor: avatarColors[1], bio: "Keeping it chill since day one.", joinDate: "Jul 2024", listenHours: 189 },
  { username: "DeepCuts", displayName: "Deep Cuts", avatarColor: avatarColors[3], bio: "Only the deep cuts.", joinDate: "May 2023", listenHours: 670 },
  { username: "WaveRider", displayName: "Wave Rider", avatarColor: avatarColors[5], bio: "Surfing sound waves.", joinDate: "Aug 2024", listenHours: 310 },
]

export function getChatUser(username: string): ChatUser | null {
  return chatUsers.find((u) => u.username === username) ?? null
}

// Pre-built mock DM conversations
export interface DirectMessage {
  id: string
  fromUsername: string
  text: string
  timestamp: Date
}

export interface Conversation {
  withUser: ChatUser
  messages: DirectMessage[]
  unreadCount: number
}

export function getMockConversations(): Conversation[] {
  const now = Date.now()
  return [
    {
      withUser: chatUsers[0], // NightOwl
      messages: [
        { id: "dm-1", fromUsername: "NightOwl", text: "Hey, what was that last track in Midnight Frequencies?", timestamp: new Date(now - 3600000 * 2) },
        { id: "dm-2", fromUsername: currentUser.username, text: "It was Neon Pulse by Synthwave Collective!", timestamp: new Date(now - 3600000 * 1.8) },
        { id: "dm-3", fromUsername: "NightOwl", text: "Thanks! Adding it to my playlist now", timestamp: new Date(now - 3600000 * 1.5) },
      ],
      unreadCount: 0,
    },
    {
      withUser: chatUsers[4], // SmoothKeys
      messages: [
        { id: "dm-4", fromUsername: "SmoothKeys", text: "You should check out Jazz After Dark, Miles Deep is spinning tonight", timestamp: new Date(now - 86400000) },
        { id: "dm-5", fromUsername: currentUser.username, text: "Oh nice, I'll hop in!", timestamp: new Date(now - 86400000 + 600000) },
        { id: "dm-6", fromUsername: "SmoothKeys", text: "Great taste by the way, saw your playlist", timestamp: new Date(now - 3600000) },
      ],
      unreadCount: 1,
    },
  ]
}

// User's favorite tracks (sorted by listen time)
export const favoritesTracks: FavoriteTrack[] = [
  { track: rooms[0].nowPlaying, listenTime: 145 },
  { track: rooms[2].queue[2], listenTime: 132 },
  { track: rooms[4].nowPlaying, listenTime: 98 },
  { track: rooms[1].nowPlaying, listenTime: 87 },
  { track: rooms[0].queue[1], listenTime: 76 },
]

// User's favorite rooms (sorted by listen time)
export const favoritesRooms: FavoriteRoom[] = [
  { room: rooms[0], listenTime: 820, visitCount: 42 },
  { room: rooms[2], listenTime: 650, visitCount: 38 },
  { room: rooms[4], listenTime: 410, visitCount: 28 },
  { room: rooms[1], listenTime: 285, visitCount: 19 },
  { room: rooms[6], listenTime: 180, visitCount: 12 },
]

// User's favorite DJs (sorted by listen time)
export const favoritesDJs: FavoriteDJ[] = [
  { dj: djs[0], listenTime: 820 },
  { dj: djs[2], listenTime: 650 },
  { dj: djs[4], listenTime: 410 },
  { dj: djs[1], listenTime: 285 },
  { dj: djs[5], listenTime: 180 },
]
