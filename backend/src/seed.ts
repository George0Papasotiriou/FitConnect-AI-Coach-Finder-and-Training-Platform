import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import db, { initializeDatabase, pool } from './db.js';

export async function seed() {
  console.log('🌱 Seeding database...\n');
  await initializeDatabase();

  await pool.query(`
    DELETE FROM push_subscriptions;
    DELETE FROM daily_tasks;
    DELETE FROM user_achievements;
    DELETE FROM achievements;
    DELETE FROM notifications;
    DELETE FROM messages;
    DELETE FROM conversation_participants;
    DELETE FROM conversations;
    DELETE FROM reviews;
    DELETE FROM sessions;
    DELETE FROM coach_requests;
    DELETE FROM trainee_profiles;
    DELETE FROM trainer_profiles;
    DELETE FROM users;
  `);

  const password = await bcrypt.hash('password123', 12);
  const adminPassword = await bcrypt.hash('admin123', 12);

  const adminId = uuid();
  await db.run('INSERT INTO users (id, name, email, password, role, xp, level, onboarding_complete) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    adminId, 'Admin', 'admin@fitconnect.com', adminPassword, 'admin', 0, 1, 1);

  const trainers = [
    {
      name: 'Elena Vasquez', email: 'elena@fitconnect.com',
      bio: 'Certified yoga instructor with 8 years of experience. Specializing in adaptive yoga for all body types and abilities, including wheelchair-accessible routines.',
      description: 'I believe fitness is for everyone. My sessions are fully adaptable for people with mobility issues, injuries, or other special needs. Together we will build strength, flexibility, and confidence.',
      specialties: ['Yoga', 'Flexibility', 'Rehabilitation', 'Adaptive Fitness'],
      experience: 8, rate: 65, rating: 4.9, reviews: 127, xp: 8500, level: 9
    },
    {
      name: 'Marcus Chen', email: 'marcus@fitconnect.com',
      bio: 'Former competitive bodybuilder turned personal trainer. Expert in strength training, nutrition planning, and body composition.',
      description: 'My 12-year journey from competitive bodybuilding to personal training has taught me that discipline and smart programming are the keys to lasting transformation.',
      specialties: ['Strength Training', 'Nutrition', 'HIIT', 'Bodybuilding'],
      experience: 12, rate: 80, rating: 4.8, reviews: 203, xp: 12000, level: 13
    },
    {
      name: 'Sofia Papadopoulos', email: 'sofia@fitconnect.com',
      bio: 'Pilates master instructor and dance fitness specialist. Creating joy through movement for 6 years.',
      description: 'Movement should be joyful! My pilates and dance-inspired workouts improve core strength, posture, and overall wellbeing in a fun and welcoming environment.',
      specialties: ['Pilates', 'Dance Fitness', 'Flexibility', 'Core Training'],
      experience: 6, rate: 55, rating: 4.7, reviews: 89, xp: 6200, level: 7
    },
    {
      name: 'James O\'Brien', email: 'james@fitconnect.com',
      bio: 'Sports performance coach and former marathon runner. Helping athletes reach peak performance through scientific training methods.',
      description: 'Whether you\'re training for your first 5K or an Olympic qualifier, I bring evidence-based performance coaching to every session.',
      specialties: ['Cardio', 'Sports Performance', 'HIIT', 'Running Coaching'],
      experience: 10, rate: 75, rating: 4.6, reviews: 156, xp: 9800, level: 10
    },
    {
      name: 'Aisha Mohammed', email: 'aisha@fitconnect.com',
      bio: 'Accessibility-focused fitness instructor with TEFAA certification. Passionate about making fitness inclusive for people with disabilities.',
      description: 'I specialize in adaptive exercise programs for people with mobility limitations, visual impairments, and chronic conditions. No body is left behind in my sessions.',
      specialties: ['Adaptive Fitness', 'Rehabilitation', 'Yoga', 'Wheelchair Fitness'],
      experience: 5, rate: 50, rating: 4.9, reviews: 72, xp: 5400, level: 6
    },
    {
      name: 'Dimitris Alexopoulos', email: 'dimitris@fitconnect.com',
      bio: 'Martial arts expert and self-defense instructor with TEFAA degree. Black belt in Taekwondo, 3x national champion.',
      description: 'From traditional martial arts to modern functional training — I help you build strength, discipline, and confidence both inside and outside the gym.',
      specialties: ['Martial Arts', 'Cardio', 'Strength Training', 'Self-Defense'],
      experience: 15, rate: 70, rating: 4.5, reviews: 198, xp: 15000, level: 16
    },
    {
      name: 'Priya Sharma', email: 'priya@fitconnect.com',
      bio: 'Nutritionist and certified personal trainer specializing in holistic wellness for women. Expert in hormonal health and sustainable weight management.',
      description: 'I take a whole-body approach — combining movement, nutrition, and mindset work to help women feel their best at every stage of life.',
      specialties: ['Nutrition', 'Women\'s Fitness', 'Weight Management', 'Wellness Coaching'],
      experience: 7, rate: 60, rating: 4.8, reviews: 94, xp: 7200, level: 8
    },
  ];

  const trainerIds: string[] = [];
  for (const t of trainers) {
    const id = uuid();
    trainerIds.push(id);
    await db.run('INSERT INTO users (id, name, email, password, role, xp, level, onboarding_complete) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      id, t.name, t.email, password, 'trainer', t.xp, t.level, 1);
    await db.run('INSERT INTO trainer_profiles (id, user_id, bio, description, specialties, experience, hourly_rate, rating, total_reviews, application_status, credentials, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      uuid(), id, t.bio, t.description, JSON.stringify(t.specialties), t.experience, t.rate, t.rating, t.reviews, 'approved',
      JSON.stringify(['TEFAA Degree', 'CPR Certified', 'First Aid Certified']), 1);
  }

  const trainees = [
    { name: 'Sarah Mitchell', email: 'sarah@example.com', goals: ['Weight Loss', 'General Fitness'], level: 'beginner', accessibility: ['None'], age: 28, weight: 68, height: 165, xp: 2400, userLevel: 3, streak: 7 },
    { name: 'Mike Johnson', email: 'mike@example.com', goals: ['Muscle Gain', 'Strength'], level: 'intermediate', accessibility: ['None'], age: 32, weight: 85, height: 180, xp: 5800, userLevel: 6, streak: 12 },
    { name: 'Anna Kowalski', email: 'anna@example.com', goals: ['Flexibility', 'Rehabilitation'], level: 'beginner', accessibility: ['Mobility Issues'], age: 45, weight: 62, height: 160, xp: 1200, userLevel: 2, streak: 3 },
    { name: 'David Park', email: 'david@example.com', goals: ['Sports Performance', 'Cardio'], level: 'advanced', accessibility: ['None'], age: 26, weight: 75, height: 178, xp: 9200, userLevel: 10, streak: 21 },
    { name: 'Maria Garcia', email: 'maria@example.com', goals: ['General Fitness', 'Weight Loss'], level: 'beginner', accessibility: ['Visual Impairment'], age: 35, weight: 71, height: 162, xp: 1800, userLevel: 2, streak: 5 },
    { name: 'Tom Williams', email: 'tom@example.com', goals: ['Stress Relief', 'Flexibility'], level: 'beginner', accessibility: ['None'], age: 41, weight: 80, height: 175, xp: 3400, userLevel: 4, streak: 9 },
  ];

  const traineeIds: string[] = [];
  for (let i = 0; i < trainees.length; i++) {
    const t = trainees[i];
    const id = uuid();
    traineeIds.push(id);
    await db.run('INSERT INTO users (id, name, email, password, role, xp, level, onboarding_complete, streak) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      id, t.name, t.email, password, 'trainee', t.xp, t.userLevel, 1, t.streak);
    await db.run('INSERT INTO trainee_profiles (id, user_id, age, weight, height, fitness_level, goals, accessibility_needs, preferred_workout_types, current_coach_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      uuid(), id, t.age, t.weight, t.height, t.level, JSON.stringify(t.goals), JSON.stringify(t.accessibility),
      JSON.stringify(['Yoga', 'Strength']), trainerIds[i % trainerIds.length]);
  }

  for (let i = 0; i < traineeIds.length; i++) {
    await db.run("INSERT INTO coach_requests (id, trainee_id, trainer_id, status) VALUES (?, ?, ?, 'accepted')",
      uuid(), traineeIds[i], trainerIds[i % trainerIds.length]);
  }

  const sessionData = [
    { trainee: 0, trainer: 0, daysAgo: 10, status: 'completed', duration: 45 },
    { trainee: 0, trainer: 0, daysAgo: 3, status: 'completed', duration: 60 },
    { trainee: 1, trainer: 1, daysAgo: 7, status: 'completed', duration: 50 },
    { trainee: 1, trainer: 1, daysAgo: 1, status: 'completed', duration: 55 },
    { trainee: 2, trainer: 4, daysAgo: 5, status: 'completed', duration: 40 },
    { trainee: 3, trainer: 3, daysAgo: 2, status: 'completed', duration: 60 },
    { trainee: 4, trainer: 4, daysAgo: 4, status: 'completed', duration: 45 },
    { trainee: 5, trainer: 0, daysAgo: 6, status: 'completed', duration: 50 },
    { trainee: 0, trainer: 0, daysFuture: 2, status: 'scheduled' },
    { trainee: 1, trainer: 1, daysFuture: 5, status: 'scheduled' },
    { trainee: 2, trainer: 4, daysFuture: 3, status: 'scheduled' },
    { trainee: 3, trainer: 3, daysFuture: 1, status: 'scheduled' },
  ];

  const sessionIds: string[] = [];
  for (const s of sessionData) {
    const sid = uuid();
    sessionIds.push(sid);
    const date = s.daysAgo
      ? new Date(Date.now() - s.daysAgo * 86400000)
      : new Date(Date.now() + (s.daysFuture || 1) * 86400000);
    await db.run('INSERT INTO sessions (id, trainer_id, trainee_id, type, status, scheduled_at, duration) VALUES (?, ?, ?, ?, ?, ?, ?)',
      sid, trainerIds[s.trainer], traineeIds[s.trainee], 'video', s.status, date.toISOString(), s.duration || null);
  }

  for (let i = 0; i < Math.min(traineeIds.length, trainerIds.length); i++) {
    const convId = uuid();
    await db.run('INSERT INTO conversations (id) VALUES (?)', convId);
    await db.run('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', convId, traineeIds[i]);
    await db.run('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)', convId, trainerIds[i]);

    const messages = [
      { sender: trainerIds[i], content: "Welcome to Insta Coach! I'm excited to start training with you. 💪 Let's crush those goals together!" },
      { sender: traineeIds[i], content: "Thank you! I've been looking forward to this. What should I prepare for our first session?" },
      { sender: trainerIds[i], content: "Just wear comfortable clothes and have a water bottle ready. We'll start with an assessment to understand your current fitness level and goals." },
      { sender: traineeIds[i], content: "That sounds perfect. I'm a bit nervous but also very motivated! 🎯" },
      { sender: trainerIds[i], content: "That's completely normal! Don't worry — we go at your pace. See you soon! 🏆" },
    ];
    for (const msg of messages) {
      await db.run('INSERT INTO messages (id, conversation_id, sender_id, content, type) VALUES (?, ?, ?, ?, ?)',
        uuid(), convId, msg.sender, msg.content, 'text');
    }
  }

  const completedSessionIds = sessionIds.filter((_, i) => sessionData[i]?.status === 'completed');
  for (let i = 0; i < Math.min(4, completedSessionIds.length); i++) {
    const sid = completedSessionIds[i];
    const sData = sessionData[i];
    await db.run('INSERT INTO reviews (id, session_id, reviewer_id, reviewee_id, rating, comment) VALUES (?, ?, ?, ?, ?, ?)',
      uuid(), sid, traineeIds[sData.trainee], trainerIds[sData.trainer],
      4 + (Math.random() > 0.5 ? 1 : 0),
      ['Amazing session! Really pushed me to my limits.', 'Great coach, very patient and knowledgeable.', 'Loved the adaptive approach, perfect for my needs.', 'Highly recommend! Already seeing results.'][i]);
  }

  const achievements = [
    { id: 'first-session', name: 'First Steps', description: 'Complete your first workout session', icon: '🏃', xpReward: 100, maxProgress: 1, category: 'sessions' },
    { id: 'five-sessions', name: 'Getting Warmed Up', description: 'Complete 5 workout sessions', icon: '🔥', xpReward: 250, maxProgress: 5, category: 'sessions' },
    { id: 'twenty-sessions', name: 'Dedicated Athlete', description: 'Complete 20 workout sessions', icon: '💎', xpReward: 500, maxProgress: 20, category: 'sessions' },
    { id: 'fifty-sessions', name: 'Unstoppable Force', description: 'Complete 50 workout sessions', icon: '⚡', xpReward: 1000, maxProgress: 50, category: 'sessions' },
    { id: 'streak-3', name: 'On a Roll', description: 'Maintain a 3-day workout streak', icon: '🔥', xpReward: 150, maxProgress: 3, category: 'streaks' },
    { id: 'streak-7', name: 'Week Warrior', description: 'Maintain a 7-day workout streak', icon: '🗓️', xpReward: 350, maxProgress: 7, category: 'streaks' },
    { id: 'streak-30', name: 'Iron Will', description: 'Maintain a 30-day workout streak', icon: '🏆', xpReward: 1500, maxProgress: 30, category: 'streaks' },
    { id: 'first-review', name: 'Feedback Giver', description: 'Leave your first session review', icon: '⭐', xpReward: 50, maxProgress: 1, category: 'social' },
    { id: 'level-5', name: 'Rising Star', description: 'Reach level 5', icon: '⬆️', xpReward: 200, maxProgress: 5, category: 'levels' },
    { id: 'level-10', name: 'Elite Status', description: 'Reach level 10', icon: '👑', xpReward: 500, maxProgress: 10, category: 'levels' },
    { id: 'social-butterfly', name: 'Social Butterfly', description: 'Send 100 messages', icon: '💬', xpReward: 300, maxProgress: 100, category: 'social' },
    { id: 'early-bird', name: 'Early Bird', description: 'Complete a session before 9 AM', icon: '🌅', xpReward: 100, maxProgress: 1, category: 'special' },
    { id: 'hundred-sessions', name: 'Century Club', description: 'Complete 100 workout sessions', icon: '🌟', xpReward: 2000, maxProgress: 100, category: 'sessions' },
    { id: 'perfect-week', name: 'Perfect Week', description: 'Complete all daily tasks for 7 days straight', icon: '✅', xpReward: 500, maxProgress: 7, category: 'streaks' },
    { id: 'coach-approved', name: 'Chosen One', description: 'Get accepted by a coach', icon: '🤝', xpReward: 75, maxProgress: 1, category: 'social' },
  ];

  for (const ach of achievements) {
    await db.run('INSERT INTO achievements (id, name, description, icon, xp_reward, max_progress, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ach.id, ach.name, ach.description, ach.icon, ach.xpReward, ach.maxProgress, ach.category);
  }

  for (const traineeId of traineeIds) {
    await db.run("INSERT INTO user_achievements (id, user_id, achievement_id, progress, unlocked, unlocked_at) VALUES (?, ?, 'first-session', 1, 1, NOW())", uuid(), traineeId);
    await db.run("INSERT INTO user_achievements (id, user_id, achievement_id, progress, unlocked, unlocked_at) VALUES (?, ?, 'first-review', 1, 1, NOW())", uuid(), traineeId);
    await db.run("INSERT INTO user_achievements (id, user_id, achievement_id, progress, unlocked, unlocked_at) VALUES (?, ?, 'coach-approved', 1, 1, NOW())", uuid(), traineeId);
  }

  await pool.query("UPDATE trainer_profiles SET rating = 4.9, total_reviews = 127 WHERE user_id = (SELECT id FROM users WHERE email = 'elena@fitconnect.com')");
  await pool.query("UPDATE trainer_profiles SET rating = 4.8, total_reviews = 203 WHERE user_id = (SELECT id FROM users WHERE email = 'marcus@fitconnect.com')");

  for (const traineeId of traineeIds.slice(0, 3)) {
    const today = new Date().toISOString().split('T')[0];
    const tasks = [
      { title: 'Complete a workout session', description: 'Attend or complete any workout session today', xpReward: 50, type: 'session' },
      { title: 'Log your water intake', description: 'Stay hydrated — mark this when done', xpReward: 15, type: 'health' },
      { title: 'Check the leaderboard', description: 'Visit the leaderboard page', xpReward: 10, type: 'engagement' },
      { title: 'Send an encouraging message', description: 'Send a message to your coach or trainee', xpReward: 20, type: 'social' },
    ];
    for (const task of tasks) {
      await db.run('INSERT INTO daily_tasks (id, user_id, title, description, xp_reward, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
        uuid(), traineeId, task.title, task.description, task.xpReward, task.type, today);
    }
  }

  for (const traineeId of traineeIds) {
    await db.run("INSERT INTO notifications (id, user_id, type, title, body, action_url, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)",
      uuid(), traineeId, 'system', '🎉 Welcome to Insta Coach!', 'Start your fitness journey by finding the perfect coach for you.', '/search', '{}');
    await db.run("INSERT INTO notifications (id, user_id, type, title, body, action_url, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)",
      uuid(), traineeId, 'achievement', '🏆 First Steps', 'You\'ve unlocked your first achievement! Keep going!', '/achievements', '{}');
  }

  console.log('💰 Seeding default bounties...');
  const defaultBounties = [
    { title: 'Push-up Challenge', description: 'Perform 50 push-ups in a single session.', xp: 150, type: 'Strength', goal: 50 },
    { title: 'Morning Run', description: 'Run for 30 minutes before 9 AM.', xp: 300, type: 'Cardio', goal: 30 },
    { title: 'Plank Master', description: 'Hold a plank for 3 minutes.', xp: 200, type: 'Core', goal: 3 }
  ];

  for (const b of defaultBounties) {
    await db.run('INSERT INTO bounties (id, trainer_id, title, description, xp_reward, exercise_type, goal_value) VALUES (?, ?, ?, ?, ?, ?, ?)',
      uuid(), adminId, b.title, b.description, b.xp, b.type, b.goal);
  }

  console.log('✅ Seed complete!\n');
  console.log('📧 Demo accounts:');
  console.log('   Admin:      admin@fitconnect.com  / admin123');
  console.log('   Trainer:    elena@fitconnect.com  / password123');
  console.log('   Trainer:    marcus@fitconnect.com / password123');
  console.log('   Trainee:    sarah@example.com     / password123');
  console.log('   Trainee:    mike@example.com      / password123');
  console.log('   Trainee(A): anna@example.com      / password123  (accessibility needs)');
  console.log('');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
}
