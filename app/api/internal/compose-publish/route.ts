import { NextResponse } from "next/server";
import { authorizeGridApi } from "@/lib/grid/api-auth";
import { publishDraftComposeGames } from "@/app/actions/cms/games";

export const maxDuration = 300;

export async function POST(request: Request) {
  if (!authorizeGridApi(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let recipeId = "";
  try {
    const body = (await request.json()) as { recipe_id?: unknown };
    recipeId = typeof body.recipe_id === "string" ? body.recipe_id.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (!recipeId) {
    return NextResponse.json({ error: "recipe_id required" }, { status: 400 });
  }

  const result = await publishDraftComposeGames(recipeId);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json(result.data);
}
