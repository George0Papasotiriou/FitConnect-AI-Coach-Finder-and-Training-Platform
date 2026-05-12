export interface Exercise {
  id: string;
  name: string;
  description: string;
  videoUrl: string;
  /** Static thumbnail URL — generated from the video by replacing MP4 with JPEG path */
  thumbUrl: string;
  equipment: string;
  bodyPart: string;
  muscleGroups: {
    primary: string[];
    secondary: string[];
  };
  effectiveness: number; // 1-5
  steps: string[];
  tips: string[];
  category: 'Compound' | 'Isolation' | 'Cardio' | 'Bodyweight';
}

// Muscle group mapping for anatomy model highlighting
export const MUSCLE_MAP: Record<string, string> = {
  'chest': 'chest',
  'pectorals': 'chest',
  'upper chest': 'chest',
  'lower chest': 'chest',
  'back': 'upperBack',
  'upper back': 'upperBack',
  'lats': 'upperBack',
  'rhomboids': 'upperBack',
  'lower back': 'lowerBack',
  'erector spinae': 'lowerBack',
  'shoulders': 'deltoids',
  'deltoids': 'deltoids',
  'front delts': 'deltoids',
  'rear delts': 'deltoids',
  'side delts': 'deltoids',
  'biceps': 'biceps',
  'triceps': 'triceps',
  'forearms': 'forearms',
  'quads': 'quads',
  'quadriceps': 'quads',
  'hamstrings': 'hamstrings',
  'glutes': 'glutes',
  'calves': 'calves',
  'core': 'core',
  'abs': 'core',
  'obliques': 'core',
};

export const BODY_PART_FILTERS = [
  'All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Core', 'Calves', 'Forearms'
];

// Helper to build S3 URLs from video ID
const S3 = (id: string) => `https://lyftaweb.s3.us-east-2.amazonaws.com/GymvisualMP4/${id}.mp4`;

// Verified thumbnail images from Lyfta's image CDN
const THUMB = (id: string) => `https://lyftaweb.s3.us-east-2.amazonaws.com/GymvisualMP4/${id}.mp4`;

export const EXERCISES: Exercise[] = [
  // ─── CHEST ───
  {
    id: 'bench-press',
    name: 'Bench Press',
    description: 'The bench press is a classic compound movement that primarily targets the chest, shoulders, and triceps. It is one of the most effective exercises for building upper body pushing strength and is a cornerstone of any serious training program.',
    videoUrl: S3('00251201'),
    thumbUrl: S3('00251201'),
    equipment: 'Barbell',
    bodyPart: 'Chest',
    muscleGroups: { primary: ['Chest'], secondary: ['Shoulders', 'Triceps'] },
    effectiveness: 5,
    steps: [
      'Lie flat on the bench with feet firmly on the floor',
      'Grip the bar slightly wider than shoulder-width apart',
      'Unrack and lower the bar to your mid-chest with control',
      'Press the bar back up to full arm extension'
    ],
    tips: ['Keep shoulder blades retracted', 'Maintain a natural arch in lower back', 'Control the descent — don\'t bounce'],
    category: 'Compound'
  },
  {
    id: 'incline-bench-press',
    name: 'Incline Bench Press',
    description: 'Performed on an incline bench to emphasize the upper portion of the pectoral muscles while also engaging the anterior deltoids more heavily than the flat bench variation.',
    videoUrl: S3('03141201'),
    thumbUrl: S3('03141201'),
    equipment: 'Barbell',
    bodyPart: 'Chest',
    muscleGroups: { primary: ['Upper Chest'], secondary: ['Shoulders', 'Triceps'] },
    effectiveness: 4.8,
    steps: [
      'Set bench to 30-45 degree incline',
      'Grip bar slightly wider than shoulders',
      'Lower to upper chest area',
      'Press up and slightly back to lockout'
    ],
    tips: ['Keep elbows at 45-degree angle', 'Do not flare elbows excessively'],
    category: 'Compound'
  },
  {
    id: 'dumbbell-bench-press',
    name: 'Dumbbell Bench Press',
    description: 'A variation using dumbbells that allows a greater range of motion and independent arm movement, improving muscle balance and targeting the chest from a different angle.',
    videoUrl: S3('02891201'),
    thumbUrl: S3('02891201'),
    equipment: 'Dumbbells',
    bodyPart: 'Chest',
    muscleGroups: { primary: ['Chest'], secondary: ['Shoulders', 'Triceps'] },
    effectiveness: 4.7,
    steps: [
      'Sit on bench with dumbbells resting on thighs',
      'Kick back and position dumbbells at chest level',
      'Press up, bringing dumbbells together at the top',
      'Lower with control to a deep stretch position'
    ],
    tips: ['Squeeze chest at the top', 'Keep wrists neutral'],
    category: 'Compound'
  },
  {
    id: 'cable-fly',
    name: 'Cable Standing Fly',
    description: 'An isolation movement using cables for constant tension throughout the range of motion, targeting the inner chest fibers for a full contraction that dumbbells cannot provide.',
    videoUrl: S3('02271201'),
    thumbUrl: S3('02271201'),
    equipment: 'Cable Machine',
    bodyPart: 'Chest',
    muscleGroups: { primary: ['Chest'], secondary: ['Front Delts'] },
    effectiveness: 4.2,
    steps: [
      'Stand between cable stations with handles at chest height',
      'Step forward with one foot for stability',
      'Bring handles together in a hugging motion',
      'Slowly return to the start position with control'
    ],
    tips: ['Maintain slight bend in elbows throughout', 'Focus on squeezing the chest at peak contraction'],
    category: 'Isolation'
  },
  {
    id: 'push-up',
    name: 'Push-Up',
    description: 'A fundamental bodyweight exercise that builds chest, shoulder, and tricep strength while engaging the core for full-body stability. Can be performed anywhere with no equipment.',
    videoUrl: S3('06621201'),
    thumbUrl: S3('06621201'),
    equipment: 'Bodyweight',
    bodyPart: 'Chest',
    muscleGroups: { primary: ['Chest'], secondary: ['Triceps', 'Shoulders', 'Core'] },
    effectiveness: 4.0,
    steps: [
      'Start in plank position with hands slightly wider than shoulders',
      'Lower your body until chest nearly touches the floor',
      'Push back up to starting position',
      'Keep your body in a straight line throughout'
    ],
    tips: ['Engage your core', 'Do not let hips sag or pike up'],
    category: 'Bodyweight'
  },
  {
    id: 'pec-deck',
    name: 'Lever Seated Fly',
    description: 'A machine-based chest isolation exercise that provides a consistent resistance curve and allows you to fully contract the pectoral muscles with reduced shoulder strain.',
    videoUrl: S3('05961201'),
    thumbUrl: S3('05961201'),
    equipment: 'Machine',
    bodyPart: 'Chest',
    muscleGroups: { primary: ['Chest'], secondary: ['Front Delts'] },
    effectiveness: 4.1,
    steps: [
      'Sit with back against pad, arms on the handles',
      'Bring handles together in front of chest',
      'Squeeze chest at the peak contraction',
      'Return slowly to starting position'
    ],
    tips: ['Keep shoulders down and back', 'Do not overstretch at the start'],
    category: 'Isolation'
  },

  // ─── BACK ───
  {
    id: 'lat-pulldown',
    name: 'Lat Pulldown',
    description: 'A cable exercise that effectively targets the latissimus dorsi, building back width and pulling strength essential for a V-taper physique.',
    videoUrl: S3('01501201'),
    thumbUrl: S3('01501201'),
    equipment: 'Cable Machine',
    bodyPart: 'Back',
    muscleGroups: { primary: ['Lats'], secondary: ['Biceps', 'Rear Delts'] },
    effectiveness: 4.8,
    steps: [
      'Grasp the bar with a wide overhand grip',
      'Sit down and secure thighs under pads',
      'Pull the bar to your upper chest',
      'Slowly return to full arm extension'
    ],
    tips: ['Lead with your elbows', 'Squeeze shoulder blades together at the bottom'],
    category: 'Compound'
  },
  {
    id: 'bent-over-row',
    name: 'Bent Over Row',
    description: 'A fundamental back exercise that builds thickness and strength across the entire posterior chain, heavily targeting the lats and rhomboids.',
    videoUrl: S3('00271201'),
    thumbUrl: S3('00271201'),
    equipment: 'Barbell',
    bodyPart: 'Back',
    muscleGroups: { primary: ['Back', 'Lats'], secondary: ['Biceps', 'Rear Delts'] },
    effectiveness: 4.9,
    steps: [
      'Hinge at hips with slight knee bend',
      'Grip barbell with overhand grip',
      'Pull bar to lower chest / upper abdomen',
      'Lower with control'
    ],
    tips: ['Keep back flat throughout', 'Do not use momentum'],
    category: 'Compound'
  },
  {
    id: 'one-arm-row',
    name: 'One Arm Dumbbell Row',
    description: 'A unilateral rowing movement that addresses muscle imbalances and allows you to focus on each side independently with a full range of motion.',
    videoUrl: S3('02921201'),
    thumbUrl: S3('02921201'),
    equipment: 'Dumbbell',
    bodyPart: 'Back',
    muscleGroups: { primary: ['Lats', 'Back'], secondary: ['Biceps', 'Rear Delts'] },
    effectiveness: 4.6,
    steps: [
      'Place one hand and knee on bench for support',
      'Hold dumbbell with free hand, arm fully extended',
      'Pull dumbbell up toward your hip',
      'Lower with control to full stretch'
    ],
    tips: ['Keep torso parallel to floor', 'Drive your elbow upward, not outward'],
    category: 'Compound'
  },
  {
    id: 'seated-row',
    name: 'Seated Cable Row',
    description: 'A machine-based back exercise that provides constant tension for developing mid-back thickness and improving posture.',
    videoUrl: S3('02391201'),
    thumbUrl: S3('02391201'),
    equipment: 'Cable Machine',
    bodyPart: 'Back',
    muscleGroups: { primary: ['Back', 'Lats'], secondary: ['Biceps', 'Rear Delts'] },
    effectiveness: 4.5,
    steps: [
      'Sit with feet on platform, knees slightly bent',
      'Grab handle with both hands',
      'Pull handle to lower chest/abdomen',
      'Extend arms back to start with control'
    ],
    tips: ['Keep chest up throughout', 'Squeeze shoulder blades at peak contraction'],
    category: 'Compound'
  },
  {
    id: 'deadlift',
    name: 'Conventional Deadlift',
    description: 'The ultimate posterior chain exercise. It targets the hamstrings, glutes, lower back, and traps while building unparalleled total-body strength and power.',
    videoUrl: S3('00431201'),
    thumbUrl: S3('00431201'),
    equipment: 'Barbell',
    bodyPart: 'Back',
    muscleGroups: { primary: ['Lower Back', 'Hamstrings', 'Glutes'], secondary: ['Lats', 'Forearms', 'Core'] },
    effectiveness: 5,
    steps: [
      'Stand with feet hip-width apart, bar over mid-foot',
      'Hinge and grip the bar just outside your knees',
      'Drive through your heels, extending hips and knees together',
      'Stand tall at lockout, then reverse the motion'
    ],
    tips: ['Keep bar close to your body', 'Engage lats before pulling', 'Never round your lower back'],
    category: 'Compound'
  },

  // ─── SHOULDERS ───
  {
    id: 'overhead-press',
    name: 'Overhead Press',
    description: 'A classic vertical pressing movement that develops all three heads of the deltoid along with tricep strength and shoulder stability.',
    videoUrl: S3('00381201'),
    thumbUrl: S3('00381201'),
    equipment: 'Barbell',
    bodyPart: 'Shoulders',
    muscleGroups: { primary: ['Shoulders'], secondary: ['Triceps', 'Upper Chest'] },
    effectiveness: 4.8,
    steps: [
      'Grip bar at shoulder width, resting on upper chest',
      'Press bar overhead to full lockout',
      'Move head slightly forward as bar passes face',
      'Lower bar back to shoulders with control'
    ],
    tips: ['Brace your core throughout', 'Avoid excessive back lean'],
    category: 'Compound'
  },
  {
    id: 'lateral-raise',
    name: 'Lateral Raise',
    description: 'An isolation exercise specifically targeting the medial (side) deltoid head, essential for building wider, more capped shoulders.',
    videoUrl: S3('03341201'),
    thumbUrl: S3('03341201'),
    equipment: 'Dumbbells',
    bodyPart: 'Shoulders',
    muscleGroups: { primary: ['Side Delts', 'Shoulders'], secondary: ['Forearms'] },
    effectiveness: 4.5,
    steps: [
      'Stand holding dumbbells at your sides',
      'Raise arms out to the sides until parallel with the floor',
      'Pause briefly at the top position',
      'Lower slowly back to your sides'
    ],
    tips: ['Lead with your elbows, not your wrists', 'A slight forward lean improves isolation'],
    category: 'Isolation'
  },
  {
    id: 'face-pull',
    name: 'Face Pull',
    description: 'A corrective and hypertrophy exercise targeting the rear deltoids and external rotators, critical for shoulder health and balanced development.',
    videoUrl: S3('01161201'),
    thumbUrl: S3('01161201'),
    equipment: 'Cable Machine',
    bodyPart: 'Shoulders',
    muscleGroups: { primary: ['Rear Delts', 'Shoulders'], secondary: ['Upper Back', 'Biceps'] },
    effectiveness: 4.6,
    steps: [
      'Set cable at upper chest height with rope attachment',
      'Pull rope towards your face, separating hands wide',
      'Externally rotate forearms at peak contraction',
      'Return to start with control'
    ],
    tips: ['Keep elbows high throughout', 'Squeeze rear delts at the end of each rep'],
    category: 'Isolation'
  },

  // ─── ARMS ───
  {
    id: 'barbell-curl',
    name: 'Barbell Curl',
    description: 'The quintessential biceps exercise using a straight barbell for maximum loading and bilateral development of the biceps brachii.',
    videoUrl: S3('00311201'),
    thumbUrl: S3('00311201'),
    equipment: 'Barbell',
    bodyPart: 'Biceps',
    muscleGroups: { primary: ['Biceps'], secondary: ['Forearms'] },
    effectiveness: 4.5,
    steps: [
      'Stand holding barbell with underhand (supinated) grip',
      'Curl the bar up by flexing at the elbows',
      'Squeeze biceps hard at the top',
      'Lower with control, fully extending your arms'
    ],
    tips: ['Keep elbows pinned to your sides', 'Avoid swinging the body for momentum'],
    category: 'Isolation'
  },
  {
    id: 'hammer-curl',
    name: 'Hammer Curl',
    description: 'A curl variation using a neutral (hammer) grip that targets the brachialis and brachioradialis in addition to the biceps, building arm thickness.',
    videoUrl: S3('03121201'),
    thumbUrl: S3('03121201'),
    equipment: 'Dumbbells',
    bodyPart: 'Biceps',
    muscleGroups: { primary: ['Biceps'], secondary: ['Forearms'] },
    effectiveness: 4.3,
    steps: [
      'Stand holding dumbbells with palms facing each other',
      'Curl dumbbells up without rotating your wrists',
      'Squeeze at the top',
      'Lower with control to full extension'
    ],
    tips: ['Keep palms facing inward throughout the entire rep', 'You may alternate arms or curl simultaneously'],
    category: 'Isolation'
  },
  {
    id: 'incline-curl',
    name: 'Incline Dumbbell Curl',
    description: 'Performed on an incline bench to place the biceps in a stretched position at the bottom, intensifying the contraction and maximizing the long head engagement.',
    videoUrl: S3('03171201'),
    thumbUrl: S3('03171201'),
    equipment: 'Dumbbells',
    bodyPart: 'Biceps',
    muscleGroups: { primary: ['Biceps'], secondary: ['Forearms'] },
    effectiveness: 4.4,
    steps: [
      'Sit on incline bench (45°) with dumbbells hanging at full stretch',
      'Curl dumbbells up while keeping upper arms stationary',
      'Squeeze at full contraction',
      'Lower slowly to a full stretch at the bottom'
    ],
    tips: ['Do not swing your arms forward', 'Full range of motion is the key to this exercise'],
    category: 'Isolation'
  },
  {
    id: 'triceps-pushdown',
    name: 'Triceps Pushdown',
    description: 'A cable-based isolation movement for developing all three heads of the triceps with constant resistance throughout the entire range of motion.',
    videoUrl: S3('02411201'),
    thumbUrl: S3('02411201'),
    equipment: 'Cable Machine',
    bodyPart: 'Triceps',
    muscleGroups: { primary: ['Triceps'], secondary: ['Forearms'] },
    effectiveness: 4.5,
    steps: [
      'Stand at cable machine with bar or rope at chest height',
      'Push the handle down by extending your elbows',
      'Squeeze triceps at full lockout',
      'Return to start with control'
    ],
    tips: ['Keep elbows glued to your sides throughout', 'Use controlled reps — no swinging'],
    category: 'Isolation'
  },
  {
    id: 'skull-crusher',
    name: 'Skull Crusher',
    description: 'A lying triceps extension that provides an excellent stretch and contraction for developing tricep mass, particularly the long head.',
    videoUrl: S3('01961201'),
    thumbUrl: S3('01961201'),
    equipment: 'EZ Bar',
    bodyPart: 'Triceps',
    muscleGroups: { primary: ['Triceps'], secondary: ['Shoulders'] },
    effectiveness: 4.4,
    steps: [
      'Lie on bench holding EZ bar above your chest',
      'Bend elbows to lower the bar toward your forehead',
      'Extend arms back to the starting position',
      'Keep upper arms stationary throughout'
    ],
    tips: ['Do not flare your elbows', 'Use a spotter for heavy sets'],
    category: 'Isolation'
  },

  // ─── LEGS ───
  {
    id: 'barbell-squat',
    name: 'Barbell Back Squat',
    description: 'Often called the king of all exercises, the back squat develops the entire lower body and builds tremendous core strength and overall athleticism.',
    videoUrl: S3('00431201'),
    thumbUrl: S3('00431201'),
    equipment: 'Barbell',
    bodyPart: 'Quads',
    muscleGroups: { primary: ['Quads', 'Glutes'], secondary: ['Hamstrings', 'Lower Back', 'Core'] },
    effectiveness: 5,
    steps: [
      'Position bar on upper traps and unrack',
      'Step back and set feet shoulder-width apart',
      'Descend by bending hips and knees simultaneously',
      'Drive up through your heels to standing'
    ],
    tips: ['Keep chest up and proud', 'Knees track over toes', 'Aim for at least parallel depth'],
    category: 'Compound'
  },
  {
    id: 'leg-extension',
    name: 'Leg Extension',
    description: 'A machine-based isolation movement that targets the quadriceps with controlled resistance, excellent for building detail in the front of the thighs.',
    videoUrl: S3('05851201'),
    thumbUrl: S3('05851201'),
    equipment: 'Machine',
    bodyPart: 'Quads',
    muscleGroups: { primary: ['Quads'], secondary: [] },
    effectiveness: 3.8,
    steps: [
      'Sit on machine with pad resting on lower shins',
      'Extend legs until fully straight',
      'Squeeze quads hard at the top',
      'Lower with control back to start'
    ],
    tips: ['Do not lock out aggressively', 'Focus on the contraction at the top'],
    category: 'Isolation'
  },
  {
    id: 'leg-curl',
    name: 'Seated Leg Curl',
    description: 'An isolation exercise targeting the hamstrings using a seated machine for controlled eccentric and concentric phases that build balanced leg development.',
    videoUrl: S3('05991201'),
    thumbUrl: S3('05991201'),
    equipment: 'Machine',
    bodyPart: 'Hamstrings',
    muscleGroups: { primary: ['Hamstrings'], secondary: ['Calves'] },
    effectiveness: 4.2,
    steps: [
      'Sit on the machine with pad positioned above your heels',
      'Curl legs back by flexing at the knees',
      'Squeeze hamstrings at full contraction',
      'Return slowly to start position'
    ],
    tips: ['Control the negative (eccentric) phase', 'Point toes slightly to vary hamstring emphasis'],
    category: 'Isolation'
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    description: 'A hip-hinge variation that targets the hamstrings and glutes with a controlled eccentric stretch phase, building posterior chain strength and flexibility.',
    videoUrl: S3('00451201'),
    thumbUrl: S3('00451201'),
    equipment: 'Barbell',
    bodyPart: 'Hamstrings',
    muscleGroups: { primary: ['Hamstrings', 'Glutes'], secondary: ['Lower Back'] },
    effectiveness: 4.8,
    steps: [
      'Hold barbell at hip level with overhand grip',
      'Push hips back while keeping a slight knee bend',
      'Lower bar along your thighs until you feel a deep hamstring stretch',
      'Drive hips forward to return to standing'
    ],
    tips: ['Keep the bar close to your body throughout', 'Feel the stretch — don\'t just go through the motions'],
    category: 'Compound'
  },
  {
    id: 'hip-thrust',
    name: 'Barbell Hip Thrust',
    description: 'The most effective exercise for glute activation and hypertrophy, performed with your upper back against a bench for maximum range of motion.',
    videoUrl: S3('04671201'),
    thumbUrl: S3('04671201'),
    equipment: 'Barbell',
    bodyPart: 'Glutes',
    muscleGroups: { primary: ['Glutes'], secondary: ['Hamstrings', 'Core'] },
    effectiveness: 4.9,
    steps: [
      'Sit on ground with upper back against a bench',
      'Roll barbell over your hips',
      'Drive through your heels, lifting hips to full extension',
      'Squeeze glutes at the top, then lower with control'
    ],
    tips: ['Keep chin tucked throughout', 'Achieve full lockout at the top of every rep'],
    category: 'Compound'
  },
  {
    id: 'calf-raise',
    name: 'Standing Calf Raise',
    description: 'A focused isolation movement for developing the gastrocnemius and soleus muscles of the calves, essential for balanced lower leg development.',
    videoUrl: S3('04171201'),
    thumbUrl: S3('04171201'),
    equipment: 'Machine',
    bodyPart: 'Calves',
    muscleGroups: { primary: ['Calves'], secondary: [] },
    effectiveness: 4.0,
    steps: [
      'Position shoulders under pads with balls of feet on platform',
      'Rise up on toes as high as possible',
      'Squeeze calves hard at the top',
      'Lower below platform level for a full stretch'
    ],
    tips: ['Full range of motion is critical for calves', 'Pause at both the top and bottom positions'],
    category: 'Isolation'
  },
  {
    id: 'lunge',
    name: 'Dumbbell Lunge',
    description: 'A unilateral leg exercise that develops balance, coordination, and lower body muscle symmetry while challenging your stabilizer muscles.',
    videoUrl: S3('01301201'),
    thumbUrl: S3('01301201'),
    equipment: 'Dumbbells',
    bodyPart: 'Quads',
    muscleGroups: { primary: ['Quads', 'Glutes'], secondary: ['Hamstrings', 'Core'] },
    effectiveness: 4.4,
    steps: [
      'Hold dumbbells at your sides, standing tall',
      'Step forward into a lunge position',
      'Lower your back knee toward the floor',
      'Push off front foot to return to the start'
    ],
    tips: ['Keep torso upright throughout', 'Front knee should track over toes, not beyond'],
    category: 'Compound'
  },

  // ─── CORE ───
  {
    id: 'cable-crunch',
    name: 'Cable Crunch',
    description: 'A weighted abdominal exercise using cable resistance for progressive overload on the rectus abdominis that bodyweight crunches simply cannot match.',
    videoUrl: S3('03771201'),
    thumbUrl: S3('03771201'),
    equipment: 'Cable Machine',
    bodyPart: 'Core',
    muscleGroups: { primary: ['Core', 'Abs'], secondary: ['Obliques'] },
    effectiveness: 4.3,
    steps: [
      'Kneel below cable with rope behind your head',
      'Crunch down by flexing through the spine',
      'Squeeze abs hard at the bottom position',
      'Return to start with control'
    ],
    tips: ['Flex through the spine — not the hips', 'Keep your hips stationary throughout'],
    category: 'Isolation'
  },
  {
    id: 'plank',
    name: 'Plank',
    description: 'An isometric core exercise that builds endurance and stability throughout the entire midsection, improving posture and functional strength.',
    videoUrl: S3('05061201'),
    thumbUrl: S3('05061201'),
    equipment: 'Bodyweight',
    bodyPart: 'Core',
    muscleGroups: { primary: ['Core'], secondary: ['Shoulders', 'Glutes'] },
    effectiveness: 4.0,
    steps: [
      'Start in forearm plank position on the floor',
      'Keep body in a straight line from head to heels',
      'Engage core tightly and hold the position',
      'Breathe steadily throughout the hold'
    ],
    tips: ['Do not let hips drop or pike up', 'Squeeze glutes for better stability'],
    category: 'Bodyweight'
  },
];
