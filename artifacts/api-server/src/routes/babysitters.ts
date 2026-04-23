import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, babysittersTable } from "@workspace/db";
import { getAuth } from "../lib/auth";
import {
  ListBabysittersResponse,
  ListBabysittersResponseItem as BabysitterSchema,
  CreateBabysitterBody,
  DeleteBabysitterParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/babysitters", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sitters = await db
    .select()
    .from(babysittersTable)
    .where(eq(babysittersTable.userId, userId))
    .orderBy(babysittersTable.createdAt);

  res.json(
    ListBabysittersResponse.parse(
      sitters.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
    ),
  );
});

router.post("/babysitters", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = CreateBabysitterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [sitter] = await db
    .insert(babysittersTable)
    .values({ userId, ...parsed.data })
    .returning();

  res.status(201).json(
    BabysitterSchema.parse({ ...sitter, createdAt: sitter.createdAt.toISOString() }),
  );
});

router.delete("/babysitters/:id", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const params = DeleteBabysitterParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [sitter] = await db
    .delete(babysittersTable)
    .where(
      and(
        eq(babysittersTable.id, params.data.id),
        eq(babysittersTable.userId, userId),
      ),
    )
    .returning();

  if (!sitter) {
    res.status(404).json({ error: "Babysitter not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
