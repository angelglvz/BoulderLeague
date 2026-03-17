-- ======================
-- USUARIOS
-- ======================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- ROCÓDROMOS
-- ======================
CREATE TABLE gyms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- LIGUILLAS
-- ======================
CREATE TABLE leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  gym_id UUID REFERENCES gyms(id) ON DELETE SET NULL,
  creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reward TEXT,
  is_private BOOLEAN DEFAULT true,
  max_participants INTEGER, -- null = ilimitado
  access_code TEXT, -- para liguillas privadas
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- PARTICIPANTES
-- ======================
CREATE TABLE league_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(league_id, user_id)
);

-- ======================
-- BLOQUES
-- ======================
CREATE TABLE blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id UUID NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  identifier TEXT NOT NULL, -- nombre, color, sector
  difficulty TEXT CHECK (difficulty IN ('novato', 'medio', 'avanzado', 'experimentado', 'profesional')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================
-- INTENTOS / RESULTADOS
-- ======================
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
  number_of_goes INTEGER NOT NULL CHECK (number_of_goes >= 0), -- 0 = no probado, 1 = flash, etc.
  score INTEGER NOT NULL, -- puntuación final calculada
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, block_id) -- solo el mejor resultado por bloque
);

-- ======================
-- ÍNDICES
-- ======================
CREATE INDEX idx_leagues_creator ON leagues(creator_id);
CREATE INDEX idx_leagues_gym ON leagues(gym_id);
CREATE INDEX idx_league_participants_league ON league_participants(league_id);
CREATE INDEX idx_league_participants_user ON league_participants(user_id);
CREATE INDEX idx_blocks_league ON blocks(league_id);
CREATE INDEX idx_attempts_user ON attempts(user_id);
CREATE INDEX idx_attempts_block ON attempts(block_id);

-- ======================
-- PREPARADO PARA FUTURO
-- ======================
-- Estas tablas las puedes añadir cuando llegue el momento:

-- Para seguir usuarios
-- CREATE TABLE follows (
--   follower_id UUID REFERENCES users(id),
--   following_id UUID REFERENCES users(id),
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   PRIMARY KEY(follower_id, following_id)
-- );

-- Para comentarios en bloques
-- CREATE TABLE comments (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID REFERENCES users(id),
--   block_id UUID REFERENCES blocks(id),
--   content TEXT NOT NULL,
--   created_at TIMESTAMPTZ DEFAULT NOW()
-- );

-- Para likes/reacciones
-- CREATE TABLE block_reactions (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID REFERENCES users(id),
--   block_id UUID REFERENCES blocks(id),
--   reaction_type TEXT, -- 'like', 'fire', etc.
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   UNIQUE(user_id, block_id, reaction_type)
-- );