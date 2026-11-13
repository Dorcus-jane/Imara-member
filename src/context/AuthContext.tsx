import React, { createContext, useContext } from 'react';
import { Member } from '../data/types';

type Auth = {
  member: Member;
  signOut: () => void;
  offline: boolean; // demo switch from the Profile screen
  toggleOffline: () => void;
};

const AuthContext = createContext<Auth | null>(null);

export const AuthProvider = AuthContext.Provider;

export function useAuth(): Auth {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
