/**
 * Mock data for development and testing
 * This simulates the data structure from the backend API
 * 
 * Usage:
 * - Import the data: import { mockFeed, mockOffers, mockNeeds, formatDate } from '../data/mockData';
 * - Use in components: const feedItems = mockFeed;
 * - To switch to real API: Replace mockFeed with API calls in your components
 * 
 * Data Structure:
 * - Offers: Services users are offering (status: 'active', 'fulfilled', 'paused', 'expired')
 * - Needs: Services users are requesting (status: 'open', 'in_progress', 'fulfilled', 'closed')
 * - Feed: Combined and sorted by creation date
 */

// Helper function to generate dates
const getDate = (daysAgo = 0) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

// Mock Offers
export const mockOffers = [
  {
    id: 1,
    user: {
      id: 1,
      username: "gardening_guru",
      email: "guru@example.com",
    },
    title: "Free Gardening Help",
    description: "I can help with planting, weeding, and garden maintenance. Available weekends. I have 10+ years of experience with organic gardening and can help with vegetable gardens, flower beds, and landscaping.",
    location: "San Francisco, CA",
    latitude: "37.7749",
    longitude: "-122.4194",
    status: "active",
    tags: [
      { id: 1, name: "gardening", slug: "gardening" },
      { id: 2, name: "outdoor", slug: "outdoor" },
    ],
    is_reciprocal: true,
    contact_preference: "message",
    created_at: getDate(2),
    updated_at: getDate(1),
    expires_at: getDate(-28), // Expires in 28 days
  },
  {
    id: 2,
    user: {
      id: 2,
      username: "tech_helper",
      email: "tech@example.com",
    },
    title: "Computer Troubleshooting Assistance",
    description: "Experienced IT professional offering free help with computer issues, software installation, and basic tech support. Can help with Windows, Mac, and Linux systems. Available evenings and weekends.",
    location: "Oakland, CA",
    latitude: "37.8044",
    longitude: "-122.2712",
    status: "active",
    tags: [
      { id: 3, name: "technology", slug: "technology" },
      { id: 4, name: "computers", slug: "computers" },
    ],
    is_reciprocal: false,
    contact_preference: "email",
    created_at: getDate(5),
    updated_at: getDate(5),
    expires_at: getDate(-25),
  },
  {
    id: 3,
    user: {
      id: 3,
      username: "cooking_mom",
      email: "mom@example.com",
    },
    title: "Home-Cooked Meal Delivery",
    description: "I love cooking and would like to share meals with neighbors. I can prepare vegetarian, vegan, or traditional meals. Perfect for busy families or individuals who want home-cooked food.",
    location: "Berkeley, CA",
    latitude: "37.8715",
    longitude: "-122.2730",
    status: "active",
    tags: [
      { id: 5, name: "cooking", slug: "cooking" },
      { id: 6, name: "food", slug: "food" },
    ],
    is_reciprocal: true,
    contact_preference: "any",
    created_at: getDate(1),
    updated_at: getDate(1),
    expires_at: getDate(-29),
  },
  {
    id: 4,
    user: {
      id: 4,
      username: "pet_lover",
      email: "pets@example.com",
    },
    title: "Pet Sitting Services",
    description: "Available to pet sit for dogs and cats. I have experience with various breeds and can provide daily walks, feeding, and companionship. References available upon request.",
    location: "San Francisco, CA",
    latitude: "37.7849",
    longitude: "-122.4094",
    status: "active",
    tags: [
      { id: 7, name: "pets", slug: "pets" },
      { id: 8, name: "care", slug: "care" },
    ],
    is_reciprocal: false,
    contact_preference: "phone",
    created_at: getDate(3),
    updated_at: getDate(2),
    expires_at: getDate(-27),
  },
];

// Mock Needs
export const mockNeeds = [
  {
    id: 1,
    user: {
      id: 5,
      username: "new_parent",
      email: "parent@example.com",
    },
    title: "Babysitting for Doctor Appointment",
    description: "Need someone to watch my 3-year-old for 2 hours next Tuesday afternoon while I attend a medical appointment. Child is well-behaved and I can provide snacks and activities.",
    location: "San Francisco, CA",
    latitude: "37.7749",
    longitude: "-122.4194",
    status: "open",
    tags: [
      { id: 9, name: "childcare", slug: "childcare" },
      { id: 10, name: "babysitting", slug: "babysitting" },
    ],
    is_urgent: true,
    contact_preference: "message",
    created_at: getDate(1),
    updated_at: getDate(1),
    expires_at: getDate(-6),
  },
  {
    id: 2,
    user: {
      id: 6,
      username: "elderly_neighbor",
      email: "neighbor@example.com",
    },
    title: "Help Moving Furniture",
    description: "Need help moving a couch and a few boxes from my living room to the garage. I'm an elderly person and can't lift heavy items. Would appreciate strong volunteers for about 30 minutes.",
    location: "Oakland, CA",
    latitude: "37.8044",
    longitude: "-122.2712",
    status: "open",
    tags: [
      { id: 11, name: "moving", slug: "moving" },
      { id: 12, name: "heavy lifting", slug: "heavy-lifting" },
    ],
    is_urgent: false,
    contact_preference: "phone",
    created_at: getDate(4),
    updated_at: getDate(4),
    expires_at: getDate(-26),
  },
  {
    id: 3,
    user: {
      id: 7,
      username: "student_helper",
      email: "student@example.com",
    },
    title: "Math Tutoring Needed",
    description: "High school student looking for help with algebra and geometry. Need someone patient and experienced to help me understand concepts. Can meet at library or online.",
    location: "Berkeley, CA",
    latitude: "37.8715",
    longitude: "-122.2730",
    status: "open",
    tags: [
      { id: 13, name: "tutoring", slug: "tutoring" },
      { id: 14, name: "education", slug: "education" },
    ],
    is_urgent: false,
    contact_preference: "message",
    created_at: getDate(6),
    updated_at: getDate(6),
    expires_at: getDate(-24),
  },
  {
    id: 4,
    user: {
      id: 8,
      username: "car_owner",
      email: "car@example.com",
    },
    title: "Car Battery Jump Start",
    description: "My car battery died in the parking lot. Need someone with jumper cables to help me start my car. I'm at the grocery store on Main Street. Willing to compensate for your time.",
    location: "San Francisco, CA",
    latitude: "37.7849",
    longitude: "-122.4094",
    status: "open",
    tags: [
      { id: 15, name: "automotive", slug: "automotive" },
      { id: 16, name: "emergency", slug: "emergency" },
    ],
    is_urgent: true,
    contact_preference: "phone",
    created_at: getDate(0),
    updated_at: getDate(0),
    expires_at: getDate(-30),
  },
];

// Combined feed (offers + needs)
export const mockFeed = [
  ...mockOffers.map(offer => ({ ...offer, type: 'offer' })),
  ...mockNeeds.map(need => ({ ...need, type: 'need' })),
].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

// Helper function to format date
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

