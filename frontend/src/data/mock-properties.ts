export interface AvailabilitySegment {
  type: 'booked' | 'open';
  flex: number;
}

export interface MockProperty {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  neighborhood: string;
  monthlyRent: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  photos: string[];
  status: 'active' | 'inactive';
  ownerName: string;
  bookable: boolean;
  availability: AvailabilitySegment[];
  rating: number;
  reviewCount: number;
}

export const MOCK_PROPERTIES: MockProperty[] = [
  {
    id: '1',
    title: 'Sunlit Studio in Downtown',
    description: 'Bright, airy studio apartment with floor-to-ceiling windows and exposed brick. Walking distance to restaurants and transit.',
    address: '142 W 57th St',
    city: 'New York',
    neighborhood: 'Midtown',
    monthlyRent: 2450,
    bedrooms: 0,
    bathrooms: 1,
    sqft: 520,
    photos: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop&q=80',
    ],
    status: 'active',
    ownerName: 'Sarah Chen',
    bookable: true,
    availability: [
      { type: 'booked', flex: 1.5 },
      { type: 'open', flex: 1 },
      { type: 'booked', flex: 0.8 },
      { type: 'open', flex: 1.7 },
    ],
    rating: 4.8,
    reviewCount: 23,
  },
  {
    id: '2',
    title: 'Modern Loft with City Views',
    description: 'Open-concept loft in the Arts District with panoramic skyline views. Concrete floors, chef\'s kitchen, in-unit laundry.',
    address: '890 Arts Way',
    city: 'Los Angeles',
    neighborhood: 'Arts District',
    monthlyRent: 3200,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1100,
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&h=400&fit=crop&q=80',
    ],
    status: 'active',
    ownerName: 'Marcus Rivera',
    bookable: true,
    availability: [
      { type: 'open', flex: 1.2 },
      { type: 'booked', flex: 1 },
      { type: 'open', flex: 1.8 },
    ],
    rating: 4.6,
    reviewCount: 17,
  },
  {
    id: '3',
    title: 'Cozy Garden Apartment',
    description: 'Charming ground-floor unit with private garden access. Quiet tree-lined street, renovated kitchen, pet-friendly.',
    address: '320 Oak Lane',
    city: 'Austin',
    neighborhood: 'Westside',
    monthlyRent: 1850,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 750,
    photos: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&h=400&fit=crop&q=80',
    ],
    status: 'active',
    ownerName: 'Emily Watson',
    bookable: true,
    availability: [
      { type: 'open', flex: 1 },
      { type: 'booked', flex: 1.2 },
      { type: 'open', flex: 0.8 },
      { type: 'booked', flex: 0.5 },
      { type: 'open', flex: 1.5 },
    ],
    rating: 4.9,
    reviewCount: 31,
  },
  {
    id: '4',
    title: 'Sleek One-Bed Near the Park',
    description: 'Minimalist one-bedroom steps from Central Park. Floor-to-ceiling windows, modern finishes, doorman building.',
    address: '401 E 72nd St',
    city: 'New York',
    neighborhood: 'Upper East Side',
    monthlyRent: 2800,
    bedrooms: 1,
    bathrooms: 1,
    sqft: 680,
    photos: [
      'https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=600&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=600&h=400&fit=crop&q=80',
    ],
    status: 'active',
    ownerName: 'James Park',
    bookable: false,
    availability: [
      { type: 'booked', flex: 2 },
      { type: 'open', flex: 1 },
      { type: 'booked', flex: 1.5 },
    ],
    rating: 4.5,
    reviewCount: 12,
  },
  {
    id: '5',
    title: 'Spacious Family Home',
    description: 'Three-bedroom home with large backyard. Updated kitchen, two-car garage, top-rated school district.',
    address: '115 Maple Drive',
    city: 'Chicago',
    neighborhood: 'Lincoln Park',
    monthlyRent: 3500,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1650,
    photos: [
      'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=600&h=400&fit=crop&q=80',
    ],
    status: 'active',
    ownerName: 'David Kim',
    bookable: true,
    availability: [
      { type: 'open', flex: 2 },
      { type: 'booked', flex: 1 },
      { type: 'open', flex: 1.5 },
    ],
    rating: 4.7,
    reviewCount: 8,
  },
  {
    id: '6',
    title: 'Urban Micro-Unit with Rooftop',
    description: 'Compact but clever micro-unit with rooftop access and co-working space. Perfect for young professionals.',
    address: '77 Tech Blvd',
    city: 'San Francisco',
    neighborhood: 'SoMa',
    monthlyRent: 2100,
    bedrooms: 0,
    bathrooms: 1,
    sqft: 380,
    photos: [
      'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=600&h=400&fit=crop&q=80',
    ],
    status: 'active',
    ownerName: 'Lisa Nguyen',
    bookable: true,
    availability: [
      { type: 'booked', flex: 0.5 },
      { type: 'open', flex: 2 },
      { type: 'booked', flex: 1 },
      { type: 'open', flex: 0.5 },
    ],
    rating: 4.4,
    reviewCount: 19,
  },
  {
    id: '7',
    title: 'Renovated Brownstone Flat',
    description: 'Gorgeous brownstone apartment with original hardwood floors, high ceilings, and marble fireplace.',
    address: '28 Beacon Hill Rd',
    city: 'Boston',
    neighborhood: 'Back Bay',
    monthlyRent: 2950,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 950,
    photos: [
      'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600566752229-250ed79470f6?w=600&h=400&fit=crop&q=80',
    ],
    status: 'active',
    ownerName: 'Robert Hale',
    bookable: true,
    availability: [
      { type: 'open', flex: 1.5 },
      { type: 'booked', flex: 1.5 },
      { type: 'open', flex: 2 },
    ],
    rating: 4.9,
    reviewCount: 42,
  },
  {
    id: '8',
    title: 'Waterfront Condo with Views',
    description: 'Stunning waterfront condo with floor-to-ceiling windows overlooking the harbor. Pool and gym included.',
    address: '500 Harbor St',
    city: 'Miami',
    neighborhood: 'Brickell',
    monthlyRent: 3800,
    bedrooms: 2,
    bathrooms: 2,
    sqft: 1200,
    photos: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=600&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600566753376-12c8ab7c55b8?w=600&h=400&fit=crop&q=80',
    ],
    status: 'active',
    ownerName: 'Ana Torres',
    bookable: true,
    availability: [
      { type: 'booked', flex: 1 },
      { type: 'open', flex: 1.5 },
      { type: 'booked', flex: 0.5 },
      { type: 'open', flex: 1 },
    ],
    rating: 4.7,
    reviewCount: 15,
  },
  {
    id: '9',
    title: 'Charming Cottage near Lake',
    description: 'Quaint two-bedroom cottage with lake views. Private dock, wraparound porch, and mature garden.',
    address: '8 Lakeview Terrace',
    city: 'Austin',
    neighborhood: 'Tarrytown',
    monthlyRent: 2200,
    bedrooms: 2,
    bathrooms: 1,
    sqft: 900,
    photos: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=400&fit=crop&q=80',
      'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=600&h=400&fit=crop&q=80',
    ],
    status: 'active',
    ownerName: 'Tom Bradley',
    bookable: false,
    availability: [
      { type: 'booked', flex: 3 },
      { type: 'open', flex: 1 },
    ],
    rating: 5.0,
    reviewCount: 6,
  },
];

export const CITIES = [...new Set(MOCK_PROPERTIES.map((p) => p.city))].sort();
export const NEIGHBORHOODS = [...new Set(MOCK_PROPERTIES.map((p) => p.neighborhood))].sort();
