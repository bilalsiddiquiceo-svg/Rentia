import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async createUser(data: { email: string; password_hash: string; phone?: string }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        password_hash: data.password_hash,
        phone: data.phone,
        role: Role.user,
      },
    });
  }

  async updateRole(userId: string, role: Role, phone?: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        role,
        ...(phone ? { phone } : {}),
      },
    });
  }

  async updateProfile(
    userId: string,
    data: { name?: string; phone?: string; email?: string },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email.toLowerCase() } : {}),
      },
    });
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash: passwordHash },
    });
  }
}
