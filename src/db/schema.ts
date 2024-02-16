import {
  mysqlTable,
  varchar,
  text,
  datetime,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";

const createdUpdated = {
  createdAt: datetime("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
};

export const user = mysqlTable("user", {
  id: varchar("id", {
    length: 100,
  })
    .primaryKey()
    .$defaultFn(() => createId()),
  userType: mysqlEnum("user_type", ["user", "streamer", "developer"]).default(
    "user"
  ),
  primaryAccountId: varchar("primary_account_id", {
    length: 100,
  })
    .notNull()
    .unique(),
  ...createdUpdated,
});

export const account = mysqlTable("user_account", {
  id: varchar("id", {
    length: 100,
  }).primaryKey(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  email: varchar("email", {
    length: 255,
  }),
  avatar: varchar("avatar", { length: 255 }),
  userId: varchar("user_id", {
    length: 100,
  })
    .notNull()
    .references(() => user.id),
  platform: mysqlEnum("platform", ["twitch", "discord"]).notNull(),
  scope: varchar("scope", {
    length: 255,
  }).notNull(),
  accessToken: varchar("access_token", {
    length: 100,
  }),
  refreshToken: varchar("refresh_token", {
    length: 100,
  }),
  expiresAt: datetime("expires_at").notNull(),
  ...createdUpdated,
});

export const session = mysqlTable("session", {
  id: varchar("id", {
    length: 100,
  })
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: varchar("user_id", {
    length: 100,
  })
    .notNull()
    .references(() => user.id),
  token: varchar("token", {
    length: 255,
  })
    .notNull()
    .unique(),
  expiresAt: datetime("expires_at").notNull(),
});
