/**
 * Universal Avatar Resolver
 * Generates sleek cyberpunk / arcade robot & persona avatars via DiceBear Bottts.
 */
export function getAvatarUrl(username?: string | null): string {
  if (!username) {
    return 'https://api.dicebear.com/7.x/bottts/svg?seed=CyberPlayer&backgroundColor=130f26,1c1635';
  }

  const clean = username.trim();
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(clean)}&backgroundColor=130f26,1c1635,2a224d`;
}
