import type { Planet, Spacecraft } from '../api/schemas'

// The real catalog (data/data.yml) as the API returns it, with ids in seed order.

type Row = [name: string, distance: number, radius: number, temp: number, gravity: number, radiation: number, moons: string[]]

const rows: Row[] = [
  ['Sun', 0, 695_508, 5505, 274, 100_000, []],
  ['Mercury', 57_900_000, 2_439.5, 167, 3.7, 1000, []],
  ['Venus', 108_200_000, 6_052, 464, 8.87, 800, []],
  ['Earth', 149_600_000, 6_371, 15, 9.8, 0.1, ['Moon']],
  ['Mars', 227_900_000, 3_389.5, -65, 3.71, 240, ['Phobos', 'Deimos']],
  ['Jupiter', 778_500_000, 69_910, -110, 24.79, 2000, ['Europa', 'Ganymede', 'Io', 'Callisto']],
  ['Saturn', 1_434_000_000, 58_230, -140, 10.44, 1000, ['Titan', 'Enceladus', 'Mimas']],
  ['Uranus', 2_871_000_000, 25_362, -195, 8.69, 500, ['Miranda', 'Ariel', 'Umbriel']],
  ['Neptune', 4_495_000_000, 24_622, -200, 11.15, 600, ['Triton', 'Proteus']],
]

export const planets: Planet[] = rows.map(([name, distance, radius, temp, gravity, radiation, moons], i) => ({
  id: i + 1,
  name,
  slug: name.toLowerCase(),
  body_type: name === 'Sun' ? 'Star' : 'Planet',
  destination: name !== 'Sun',
  radius_km: radius,
  distance_from_sun_km: distance,
  average_temperature_c: temp,
  gravity_m_per_s2: gravity,
  radiation_levels_msv: radiation,
  potentially_habitable: name === 'Earth' || name === 'Mars',
  weather_patterns: name === 'Jupiter' ? 'Intense storms, Great Red Spot' : 'Varied',
  moons,
  extra_attributes: {},
}))

type CraftRow = [name: string, size: string, capacity: number, range: number, speed: number, generator: boolean, min: number, max: number]

const craftRows: CraftRow[] = [
  ['Millennial Hopper', 'Small', 5, 400_000_000, 500_000, true, -300, 150],
  ['Star Explorer 1', 'Medium', 10, 1_500_000_000, 750_000, false, -280, 465],
  ['Nyx Odyssey', 'Large', 21, 8_000_000_000, 600_000, true, -350, 250],
  ['Nostromo II', 'Medium', 16, 3_000_000_000, 800_000, true, -305, 100],
  ['Serenity XL', 'Extra Large', 30, 15_000_000_000, 500_000, true, -420, 500],
  ['Galactica Scout', 'Small', 3, 500_000_000, 400_000, false, -310, 555],
]

export const fleet: Spacecraft[] = craftRows.map(([name, size, capacity, range, speed, generator, min, max], i) => ({
  id: i + 1,
  name,
  slug: name.toLowerCase().replaceAll(' ', '-'),
  size,
  mass_kg: null,
  capacity,
  range_km: range,
  speed_kmh: speed,
  gravity_generator: generator,
  min_operating_temp_c: min,
  max_operating_temp_c: max,
  extra_attributes: {},
  landable_planet_ids: planets
    .filter((p) => p.destination && p.average_temperature_c >= min && p.average_temperature_c <= max)
    .map((p) => p.id),
}))

export const planetNamed = (name: string) => planets.find((p) => p.name === name)!
export const spacecraftNamed = (name: string) => fleet.find((s) => s.name === name)!
