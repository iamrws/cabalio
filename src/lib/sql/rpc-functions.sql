-- Atomic increment for game player state (fixes FINDING-BL-002)
CREATE OR REPLACE FUNCTION increment_game_state(
  p_wallet TEXT,
  p_points_delta INT,
  p_new_streak INT
) RETURNS void AS $$
BEGIN
  INSERT INTO game_player_state (wallet_address, points, streak, updated_at)
  VALUES (p_wallet, p_points_delta, p_new_streak, NOW())
  ON CONFLICT (wallet_address) DO UPDATE
  SET points = game_player_state.points + p_points_delta,
      streak = p_new_streak,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Atomic increment for user XP (fixes FINDING-BL-003)
CREATE OR REPLACE FUNCTION increment_user_xp(
  p_wallet TEXT,
  p_delta INT
) RETURNS void AS $$
BEGIN
  UPDATE users
  SET total_xp = total_xp + p_delta,
      updated_at = NOW()
  WHERE wallet_address = p_wallet;
END;
$$ LANGUAGE plpgsql;

-- Atomic nonce consumption (fixes FINDING-A07-002)
CREATE OR REPLACE FUNCTION consume_nonce(
  p_nonce TEXT,
  p_wallet TEXT
) RETURNS TABLE(nonce TEXT, wallet_address TEXT) AS $$
BEGIN
  RETURN QUERY
  UPDATE auth_nonces
  SET used = true, used_at = NOW()
  WHERE auth_nonces.nonce = p_nonce
    AND auth_nonces.wallet_address = p_wallet
    AND auth_nonces.used = false
  RETURNING auth_nonces.nonce, auth_nonces.wallet_address;
END;
$$ LANGUAGE plpgsql;

-- Cleanup old nonces (run periodically via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_nonces() RETURNS void AS $$
BEGIN
  DELETE FROM auth_nonces
  WHERE issued_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;
