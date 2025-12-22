import { db, Intros, Types, Sayings, Users, eq } from 'astro:db';
import 'dotenv/config';
import crypto from 'crypto';

// 50 clever, funny, and witty sayings
const sayingsData = [
  // People
  { type: "people", firstKind: "respond \"K\" to everything", secondKind: "write paragraphs of explanation" },
  { type: "people", firstKind: "leave one slice of pizza in the box", secondKind: "finish what they start" },
  { type: "people", firstKind: "hit snooze seventeen times", secondKind: "spring out of bed at first alarm" },
  { type: "people", firstKind: "merge at the last possible second", secondKind: "merge a mile before the lane ends" },
  { type: "people", firstKind: "never read instruction manuals", secondKind: "read them cover to cover before opening the box" },
  { type: "people", firstKind: "leave shopping carts in parking spots", secondKind: "return them to the corral" },
  { type: "people", firstKind: "eat dessert first", secondKind: "save the best for last" },
  { type: "people", firstKind: "arrive fashionably late", secondKind: "show up 15 minutes early to everything" },
  { type: "people", firstKind: "let their phone battery die regularly", secondKind: "panic at 20% and immediately find a charger" },
  { type: "people", firstKind: "keep 47 browser tabs open", secondKind: "close everything after each session" },

  // Programmers
  { type: "programmers", firstKind: "comment everything", secondKind: "believe good code is self-documenting" },
  { type: "programmers", firstKind: "use tabs", secondKind: "use spaces" },
  { type: "programmers", firstKind: "prefer dark mode", secondKind: "somehow still use light mode" },
  { type: "programmers", firstKind: "test in production", secondKind: "have a proper QA process" },
  { type: "programmers", firstKind: "Google every error message", secondKind: "actually read the documentation" },

  // Cats
  { type: "cats", firstKind: "knock things off tables while maintaining eye contact", secondKind: "wait until you leave the room" },
  { type: "cats", firstKind: "want in immediately after being let out", secondKind: "want out immediately after being let in" },
  { type: "cats", firstKind: "sleep on your keyboard", secondKind: "sleep on your face at 3am" },
  { type: "cats", firstKind: "ignore expensive toys to play with the box", secondKind: "ignore expensive toys to play with a bottle cap" },
  { type: "cats", firstKind: "act like they own the place", secondKind: "actually do own the place" },

  // Dogs
  { type: "dogs", firstKind: "greet you like you've been gone for years after 5 minutes", secondKind: "give you the cold shoulder for leaving them" },
  { type: "dogs", firstKind: "steal food when you're not looking", secondKind: "maintain perfect eye contact while stealing food" },
  { type: "dogs", firstKind: "love everyone equally", secondKind: "are ride-or-die loyal to one person only" },
  { type: "dogs", firstKind: "refuse to go outside in the rain", secondKind: "jump in every puddle they can find" },

  // Parents
  { type: "parents", firstKind: "count to three", secondKind: "never get past two" },
  { type: "parents", firstKind: "swore they'd never say 'because I said so'", secondKind: "say it daily now" },
  { type: "parents", firstKind: "remember every word of Goodnight Moon", secondKind: "can recite every episode of Bluey" },
  { type: "parents", firstKind: "let their kids stay up late", secondKind: "have strict bedtime routines they defend like their life depends on it" },

  // Drivers
  { type: "drivers", firstKind: "accelerate toward yellow lights", secondKind: "brake at the first hint of yellow" },
  { type: "drivers", firstKind: "use turn signals religiously", secondKind: "apparently don't know their car has turn signals" },
  { type: "drivers", firstKind: "back into parking spaces", secondKind: "pull straight in and deal with the consequences later" },
  { type: "drivers", firstKind: "tailgate in the slow lane", secondKind: "go exactly the speed limit in the fast lane" },

  // Coffee drinkers
  { type: "coffee drinkers", firstKind: "need coffee before they can speak", secondKind: "are annoyingly chipper in the morning without it" },
  { type: "coffee drinkers", firstKind: "drink it black and judge everyone else", secondKind: "order beverages that are basically desserts" },
  { type: "coffee drinkers", firstKind: "refuse to pay $7 for coffee", secondKind: "have a monthly coffee budget larger than their grocery bill" },

  // Coworkers
  { type: "coworkers", firstKind: "reply-all to everything", secondKind: "forget to reply at all" },
  { type: "coworkers", firstKind: "schedule meetings to discuss the previous meeting", secondKind: "solve everything in Slack threads" },
  { type: "coworkers", firstKind: "eat smelly food at their desk", secondKind: "microwave fish in the break room" },
  { type: "coworkers", firstKind: "have camera on in every meeting", secondKind: "haven't turned their camera on since 2020" },

  // Travelers
  { type: "travelers", firstKind: "arrive at the airport 3 hours early", secondKind: "run through the terminal to catch their flight" },
  { type: "travelers", firstKind: "pack a week before the trip", secondKind: "pack in the Uber to the airport" },
  { type: "travelers", firstKind: "plan every minute of the itinerary", secondKind: "wing it entirely" },

  // Roommates
  { type: "roommates", firstKind: "label everything in the fridge", secondKind: "consider all food communal property" },
  { type: "roommates", firstKind: "clean as they go", secondKind: "let dishes pile up until there are no clean plates left" },
  { type: "roommates", firstKind: "keep the thermostat at 65", secondKind: "keep it at 75 and complain about the electricity bill" },

  // Movie watchers
  { type: "movie watchers", firstKind: "talk through the entire movie", secondKind: "shush everyone who makes a sound" },
  { type: "movie watchers", firstKind: "leave immediately when credits roll", secondKind: "stay to watch every single credit" },
  { type: "movie watchers", firstKind: "spoil the ending", secondKind: "get genuinely angry about spoilers from movies made in 1975" },

  // Gym people
  { type: "gym people", firstKind: "grunt loudly with every rep", secondKind: "workout in complete silence" },
  { type: "gym people", firstKind: "wipe down equipment", secondKind: "leave sweat puddles for the next person" },
];

// Get a random time of day (spread across business hours: 8am-8pm)
function getRandomTimeForDay(dayOffset) {
  const now = new Date();
  const futureDate = new Date(now);
  futureDate.setDate(now.getDate() + dayOffset);

  // Random hour between 8 and 20 (8am to 8pm)
  const hour = Math.floor(Math.random() * 12) + 8;
  // Random minute
  const minute = Math.floor(Math.random() * 60);
  // Random second
  const second = Math.floor(Math.random() * 60);

  futureDate.setHours(hour, minute, second, 0);
  return futureDate;
}

async function seedFutureSayings() {
  try {
    console.log('Starting future sayings seed...');

    // Get or create the system user
    let systemUsers = await db.select().from(Users).where(eq(Users.email, 'system@twokindsof.com'));

    let systemUserId;
    if (systemUsers.length === 0) {
      console.log('System user not found, creating it...');

      // Create system user
      const newUser = await db.insert(Users).values({
        id: crypto.randomUUID(),
        name: 'System',
        email: 'system@twokindsof.com',
        provider: 'system',
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        role: 'system',
        preferences: {},
      }).returning();

      systemUserId = newUser[0].id;
      console.log(`Created system user with ID: ${systemUserId}`);
    } else {
      systemUserId = systemUsers[0].id;
      console.log(`Using existing system user ID: ${systemUserId}`);
    }

    // Get existing intros
    const intros = await db.select().from(Intros);
    if (intros.length === 0) {
      console.error('No intros found! Please run initial seed first.');
      process.exit(1);
    }
    console.log(`Found ${intros.length} intros`);

    // Get existing types or create new ones
    const existingTypes = await db.select().from(Types);
    const existingTypeNames = new Set(existingTypes.map(t => t.name));

    // Types we need for our sayings
    const neededTypes = [
      { name: "programmers", pronoun: "who" },
      { name: "cats", pronoun: "that" },
      { name: "parents", pronoun: "who" },
      { name: "drivers", pronoun: "who" },
      { name: "coffee drinkers", pronoun: "who" },
      { name: "coworkers", pronoun: "who" },
      { name: "travelers", pronoun: "who" },
      { name: "roommates", pronoun: "who" },
      { name: "movie watchers", pronoun: "who" },
      { name: "gym people", pronoun: "who" },
    ];

    // Create missing types
    const typesToCreate = neededTypes.filter(t => !existingTypeNames.has(t.name));
    if (typesToCreate.length > 0) {
      console.log(`Creating ${typesToCreate.length} new types...`);
      await db.insert(Types).values(
        typesToCreate.map(t => ({
          ...t,
          createdAt: new Date(),
        }))
      );
    }

    // Get all types now
    const allTypes = await db.select().from(Types);
    const typeMap = new Map(allTypes.map(t => [t.name, t]));
    console.log(`Total types available: ${allTypes.length}`);

    // Prepare sayings with future timestamps
    // 5 sayings per day for 10 days
    const sayingsToInsert = [];

    for (let i = 0; i < sayingsData.length; i++) {
      const saying = sayingsData[i];
      const dayOffset = Math.floor(i / 5) + 1; // Day 1-10
      const timestamp = getRandomTimeForDay(dayOffset);

      // Get a random intro
      const intro = intros[Math.floor(Math.random() * intros.length)];

      // Get the type
      const type = typeMap.get(saying.type);
      if (!type) {
        console.warn(`Type "${saying.type}" not found, skipping saying`);
        continue;
      }

      sayingsToInsert.push({
        intro: intro.id,
        type: type.id,
        firstKind: saying.firstKind,
        secondKind: saying.secondKind,
        userId: systemUserId,
        createdAt: timestamp,
        updatedAt: timestamp,
      });

      console.log(`Day ${dayOffset}: Scheduling "${saying.firstKind}" for ${timestamp.toISOString()}`);
    }

    // Insert all sayings
    console.log(`\nInserting ${sayingsToInsert.length} sayings...`);
    await db.insert(Sayings).values(sayingsToInsert);

    console.log('\n✓ Future sayings seed completed successfully!');
    console.log(`✓ Added ${sayingsToInsert.length} sayings scheduled over the next 10 days`);
    console.log(`✓ Sayings will appear at 5 per day at various times`);

  } catch (error) {
    console.error('Error seeding future sayings:', error);
    throw error;
  }
}

// Export as default for astro db execute
export default seedFutureSayings;
