
import { NextResponse, type NextRequest } from 'next/server';

// A funcionalidade de Autenticação foi removida.
export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url);
  // Redireciona para a página inicial caso alguém acesse este endpoint.
  return NextResponse.redirect(new URL('/', origin).toString());
}
