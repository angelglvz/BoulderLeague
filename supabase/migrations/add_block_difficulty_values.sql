-- Añadir los valores 'principiante' y 'elite' al enum block_difficulty
ALTER TYPE block_difficulty ADD VALUE IF NOT EXISTS 'principiante';
ALTER TYPE block_difficulty ADD VALUE IF NOT EXISTS 'elite';

