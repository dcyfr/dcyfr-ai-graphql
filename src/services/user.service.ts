/**
 * User service - business logic for user operations
 */

import { db } from '../lib/db/index.js';
import { hashPassword, verifyPassword, createToken } from '../lib/utils/auth.js';
import { validateInput, createUserSchema, updateUserSchema, loginSchema } from '../lib/schemas/validation.js';
import type { User, AuthPayload, AuthUser, ServerConfig } from '../lib/types.js';

export class UserService {
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
  }

  async findById(id: string): Promise<User | null> {
    const user = db.findUserById(id);
    if (!user) return null;
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = db.findUserByEmail(email);
    if (!user) return null;
    const { passwordHash: _, ...rest } = user;
    return rest;
  }

  async findByIds(ids: string[]): Promise<(User | null)[]> {
    return db.findUsersByIds(ids);
  }

  async list(limit?: number, afterCursor?: string) {
    return db.listUsers(limit, afterCursor);
  }

  async register(input: unknown): Promise<AuthPayload> {
    const data = validateInput(createUserSchema, input);

    // Check for existing user
    const existing = db.findUserByEmail(data.email);
    if (existing) {
      throw new Error('Email already registered');
    }

    const passwordHash = hashPassword(data.password);
    const user = db.createUser({
      email: data.email,
      name: data.name,
      passwordHash,
      bio: data.bio,
    });

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = createToken(authUser, this.config.auth.jwtSecret, this.config.auth.jwtExpiresIn);

    return { token, user };
  }

  async login(input: unknown): Promise<AuthPayload> {
    const data = validateInput(loginSchema, input);

    const user = db.findUserByEmail(data.email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!verifyPassword(data.password, user.passwordHash)) {
      throw new Error('Invalid credentials');
    }

    const { passwordHash: _, ...userWithoutPassword } = user;

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = createToken(authUser, this.config.auth.jwtSecret, this.config.auth.jwtExpiresIn);

    return { token, user: userWithoutPassword };
  }

  async update(userId: string, input: unknown): Promise<User> {
    const data = validateInput(updateUserSchema, input);
    const user = db.updateUser(userId, data);
    if (!user) throw new Error('User not found');
    return user;
  }

  async delete(userId: string): Promise<boolean> {
    return db.deleteUser(userId);
  }

  getCount(): number {
    return db.getUserCount();
  }
}
