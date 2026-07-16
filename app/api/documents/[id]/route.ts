import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { requireAdminApi, AdminAuthorizationError } from "@/lib/auth/require-admin";
import { prisma } from "@/lib/prisma";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdminApi();
    const { id } = await params;
    const document = await prisma.storedDocument.findFirst({ where: { id, deletedAt: null } });
    if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const blob = await get(document.blobPath, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!blob || blob.statusCode !== 200) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.auditLog.create({ data: { entityType: "StoredDocument", entityId: id, action: "DOWNLOADED", actor: session.user?.email || "ADMIN" } });
    return new Response(blob.stream, { headers: { "content-type": document.mimeType, "content-length": String(document.sizeBytes), "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.originalFilename)}`, "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    throw error;
  }
}
