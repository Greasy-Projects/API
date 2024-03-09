import {
  mysqlTable,
  varchar,
  text,
  datetime,
  mysqlEnum,
  AnyMySqlColumn,
} from "drizzle-orm/mysql-core";
import { createId } from "@paralleldrive/cuid2";

const lengthOf = {
  id: 100,
};

const createdUpdated = {
  createdAt: datetime("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: datetime("updated_at")
    .notNull()
    .$defaultFn(() => new Date()),
};

export const users = mysqlTable("users", {
  id: varchar("id", {
    length: lengthOf.id,
  })
    .primaryKey()
    .$defaultFn(() => createId()),
  userType: mysqlEnum("user_type", ["user", "streamer", "developer"]).default(
    "user"
  ),
  primaryAccountId: varchar("primary_account_id", {
    length: lengthOf.id,
  })
    .notNull()
    .unique()
    .references(() => accounts.id, {
      onDelete: "cascade",
      onUpdate: "restrict",
    }),
  ...createdUpdated,
});

export const accounts = mysqlTable("user_accounts", {
  id: varchar("id", {
    length: lengthOf.id,
  }).primaryKey(),
  username: text("username").notNull(),
  displayName: text("display_name").notNull(),
  email: varchar("email", {
    length: 255,
  }),
  avatar: varchar("avatar", { length: 255 }),
  userId: varchar("user_id", {
    length: lengthOf.id,
  }).references((): AnyMySqlColumn => users.id, {
    onDelete: "cascade",
    onUpdate: "restrict",
  }),
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
export const sessions = mysqlTable("sessions", {
  id: varchar("id", {
    length: lengthOf.id,
  })
    .primaryKey()
    .$defaultFn(() => createId()),
  userId: varchar("user_id", {
    length: lengthOf.id,
  })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", {
    length: 255,
  })
    .notNull()
    .unique(),
  expiresAt: datetime("expires_at").notNull(),
});

// // TODO: logs table
// export const logs = mysqlTable(
//   "logs",
//   {
//     id: varchar("id", {
//       length: 100,
//     })
//       .primaryKey()
//       .$defaultFn(() => createId()),
//     createdAt: datetime("created_at")
//       .notNull()
//       .$defaultFn(() => new Date()),
//     userId: varchar("user_id", {
//         length: 100,
//       }).notNull(),
//     message: text("message"),

//     tags:
//   },
//   (table) => {
//   return {
//     userIdIdx:  index("user_id_idx").on(table.userId),
//     createdAtIdx:   index("created_at_idx").on(table.createdAt),
//     //tags
//   }
//   }
// );
