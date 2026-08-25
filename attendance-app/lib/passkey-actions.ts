'use server'

import { cookies } from 'next/headers'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server'
import { getSession } from './auth'
import { createAdminClient } from './supabase/server'

// Configuration
const rpName = 'AttendanceIQ'
const rpID = process.env.NODE_ENV === 'development' ? 'localhost' : 'attendanceiq.app'
const origin = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : `https://${rpID}`

export async function getRegistrationOptions() {
  const session = await getSession()
  if (!session || !session.studentProfile) {
    throw new Error('Unauthorized')
  }

  const user = {
    id: session.userId,
    username: session.email,
    displayName: session.studentProfile.name,
  }

  // Get existing passkeys to exclude them
  const adminClient = createAdminClient()
  const { data: passkeys } = await adminClient
    .from('passkeys')
    .select('id, transports')
    .eq('student_id', user.id)

  const excludeCredentials = (passkeys || []).map(pk => ({
    id: pk.id,
    type: 'public-key' as const,
    transports: pk.transports as any[],
  }))

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: user.username,
    userDisplayName: user.displayName,
    attestationType: 'none',
    excludeCredentials,
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  })

  // Store challenge in cookie
  const cookieStore = await cookies()
  cookieStore.set('passkey-challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300, // 5 minutes
    path: '/',
  })

  return options
}

export async function verifyRegistration(body: any) {
  const session = await getSession()
  if (!session || !session.studentProfile) {
    throw new Error('Unauthorized')
  }

  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get('passkey-challenge')?.value

  if (!expectedChallenge) {
    throw new Error('Challenge expired or not found')
  }

  let verification
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    })
  } catch (error: any) {
    throw new Error(`Verification failed: ${error.message}`)
  }

  if (verification.verified && verification.registrationInfo) {
    const { credential } = verification.registrationInfo
    const credentialID = credential.id
    const credentialPublicKey = credential.publicKey
    const counter = credential.counter

    const adminClient = createAdminClient()
    
    // Store as Buffer/base64 depending on DB setup. 
    // We'll store standard string and bytea. 
    // In JS, bytea is best inserted as Hex or base64 if using Supabase client.
    // For simplicity, we convert to hex.
    const publicKeyHex = Buffer.from(credentialPublicKey).toString('hex')

    const { error } = await adminClient.from('passkeys').insert({
      id: credentialID,
      student_id: session.userId,
      public_key: `\\x${publicKeyHex}`, // postgres bytea hex format
      sign_count: counter,
      transports: body.response.transports || [],
    })

    if (error) {
      throw new Error(`DB Error: ${error.message}`)
    }

    // Clear challenge
    cookieStore.delete('passkey-challenge')
    return { success: true }
  }

  return { success: false }
}

export async function getAuthenticationOptions() {
  const session = await getSession()
  if (!session || !session.studentProfile) {
    throw new Error('Unauthorized')
  }

  const adminClient = createAdminClient()
  const { data: passkeys } = await adminClient
    .from('passkeys')
    .select('id, transports')
    .eq('student_id', session.userId)

  const allowCredentials = (passkeys || []).map(pk => ({
    id: pk.id,
    type: 'public-key' as const,
    transports: pk.transports as any[],
  }))

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials,
    userVerification: 'preferred',
  })

  const cookieStore = await cookies()
  cookieStore.set('passkey-challenge', options.challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 300,
    path: '/',
  })

  return options
}

export async function verifyAuthentication(body: any) {
  const session = await getSession()
  if (!session || !session.studentProfile) {
    throw new Error('Unauthorized')
  }

  const cookieStore = await cookies()
  const expectedChallenge = cookieStore.get('passkey-challenge')?.value

  if (!expectedChallenge) {
    throw new Error('Challenge expired or not found')
  }

  const adminClient = createAdminClient()
  const { data: passkey } = await adminClient
    .from('passkeys')
    .select('*')
    .eq('id', body.id)
    .single()

  if (!passkey) {
    throw new Error('Passkey not found in DB')
  }

  // Convert postgres bytea hex back to Uint8Array
  const publicKeyHex = passkey.public_key.replace(/^\\x/, '')
  const credentialPublicKey = new Uint8Array(Buffer.from(publicKeyHex, 'hex'))

  let verification
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.id,
        publicKey: credentialPublicKey,
        counter: Number(passkey.sign_count),
        transports: passkey.transports,
      },
    })
  } catch (error: any) {
    throw new Error(`Verification failed: ${error.message}`)
  }

  if (verification.verified && verification.authenticationInfo) {
    const { newCounter } = verification.authenticationInfo

    await adminClient
      .from('passkeys')
      .update({
        sign_count: newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', passkey.id)

    cookieStore.delete('passkey-challenge')
    return { success: true }
  }

  return { success: false }
}
