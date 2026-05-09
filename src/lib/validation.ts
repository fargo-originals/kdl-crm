import { NextResponse } from 'next/server';
import { z } from 'zod';

export type ValidationErrorResponse = {
  error: 'Validation failed';
  issues: Array<{
    path: string;
    message: string;
    code: string;
  }>;
};

export async function parseJsonBody(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new z.ZodError([
      {
        code: 'custom',
        path: [],
        message: 'El cuerpo de la petición debe ser JSON válido',
        input: undefined,
      },
    ]);
  }
}

export function validationErrorResponse(error: z.ZodError): NextResponse<ValidationErrorResponse> {
  return NextResponse.json(
    {
      error: 'Validation failed',
      issues: error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      })),
    },
    { status: 422 },
  );
}

export async function validateJsonBody<T extends z.ZodType>(
  req: Request,
  schema: T,
): Promise<{ data: z.infer<T> } | { response: NextResponse<ValidationErrorResponse> }> {
  try {
    const json = await parseJsonBody(req);
    return { data: schema.parse(json) };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { response: validationErrorResponse(error) };
    }
    throw error;
  }
}
