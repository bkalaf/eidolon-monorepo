import argon2 from "argon2";

const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 2 ** 17,
  timeCost: 3,
  parallelism: 2,
};

export function hashPassword(password) {
  return argon2.hash(password, ARGON_OPTIONS);
}

export function verifyPassword(hash, password) {
  return argon2.verify(hash, password);
}
