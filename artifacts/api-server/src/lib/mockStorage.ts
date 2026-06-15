// In-memory mock storage for local development without database
interface MockUser {
  id: number;
  clerkId: string;
  email: string;
  name: string;
  passwordHash: string;
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
  role: "owner" | "manager" | "cashier";
  branchId?: number;
  createdAt: Date;
}

class MockStorage {
  private users: Map<number, MockUser> = new Map();
  private emailIndex: Map<string, number> = new Map();
  private nextId = 1;

  findByEmail(email: string): MockUser | undefined {
    const id = this.emailIndex.get(email.toLowerCase());
    return id ? this.users.get(id) : undefined;
  }

  findById(id: number): MockUser | undefined {
    return this.users.get(id);
  }

  findByClerkId(clerkId: string): MockUser | undefined {
    for (const user of this.users.values()) {
      if (user.clerkId === clerkId) return user;
    }
    return undefined;
  }

  createUser(data: Omit<MockUser, "id" | "createdAt">): MockUser {
    const id = this.nextId++;
    const user: MockUser = {
      ...data,
      id,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    this.emailIndex.set(data.email.toLowerCase(), id);
    return user;
  }

  updateUser(id: number, updates: Partial<MockUser>): MockUser | undefined {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updated = { ...user, ...updates };
    this.users.set(id, updated);

    // Update email index if email changed
    if (updates.email && updates.email !== user.email) {
      this.emailIndex.delete(user.email.toLowerCase());
      this.emailIndex.set(updates.email.toLowerCase(), id);
    }

    return updated;
  }

  getAllUsers(): MockUser[] {
    return Array.from(this.users.values());
  }

  isEmpty(): boolean {
    return this.users.size === 0;
  }
}

export const mockStorage = new MockStorage();
