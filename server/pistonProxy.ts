import type { Request, Response } from 'express'

/**
 * Java / C# 등의 코드 실행을 위한 Piston API 프록시.
 *
 * 2026-02-15 부터 emkc.org 공개 Piston API 는 whitelist 전용으로 전환되어
 * 인증되지 않은 클라이언트는 아래 에러를 받게 됩니다:
 *
 *   "Public Piston API is now whitelist only as of 2/15/2026.
 *    Please contact EngineerMan on Discord ... or consider hosting your own Piston instance."
 *
 * 해결책 두 가지:
 *   1. 자체 Piston 호스팅: docker run -d -p 2000:2000 ghcr.io/engineer-man/piston
 *      → 프론트/백엔드 설정에서 URL 을 http://localhost:2000/api/v2/piston/execute 로.
 *   2. 공공 대체 인스턴스 사용 (예: 커뮤니티가 호스팅하는 서드파티 URL).
 *
 * 이 프록시는:
 *   - 요청 바디의 url 우선 사용 → 없으면 env PISTON_URL → 없으면 기본 emkc.org
 *   - 화이트리스트 응답을 감지해 친절한 에러 메시지로 변환
 */

const DEFAULT_PISTON_URL =
  process.env.PISTON_URL || 'https://emkc.org/api/v2/piston/execute'

interface PistonProxyBody {
  /** 사용자 지정 Piston 엔드포인트 (전체 URL, /execute 포함) */
  url?: string
  /** Piston execute API 가 기대하는 표준 바디 */
  payload: unknown
}

function isWhitelistError(text: string): boolean {
  return /whitelist only/i.test(text) || /contact EngineerMan/i.test(text)
}

export async function handlePistonRun(req: Request, res: Response): Promise<void> {
  const body = (req.body ?? {}) as PistonProxyBody
  const url = (typeof body.url === 'string' && body.url.trim()) || DEFAULT_PISTON_URL

  if (!body.payload || typeof body.payload !== 'object') {
    res.status(400).json({ error: 'payload(object) 가 필요합니다.' })
    return
  }

  let upstream: globalThis.Response
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body.payload),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(502).json({
      error: `Piston 엔드포인트(${url})에 연결할 수 없습니다: ${msg}`,
      hint: '자체 Piston 인스턴스를 실행하거나, 설정에서 올바른 URL 을 입력해주세요.',
    })
    return
  }

  const text = await upstream.text()

  if (!upstream.ok) {
    if (isWhitelistError(text)) {
      res.status(502).json({
        error:
          'emkc.org 공개 Piston API 는 2026-02-15 부터 whitelist 전용으로 전환됐습니다.',
        hint: [
          '해결 방법:',
          '  1) 자체 호스팅 (권장): docker run -d -p 2000:2000 ghcr.io/engineer-man/piston',
          '     → 설정 > Piston URL 에 http://localhost:2000/api/v2/piston/execute 입력',
          '  2) 서버 env PISTON_URL 로 커스텀 인스턴스 지정',
        ].join('\n'),
        raw: text,
      })
      return
    }
    res.status(upstream.status).json({
      error: `Piston API 오류 (${upstream.status})`,
      raw: text,
    })
    return
  }

  res.type('application/json').send(text)
}
