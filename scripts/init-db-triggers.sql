CREATE EXTENSION IF NOT EXISTS pg_notify;

CREATE OR REPLACE FUNCTION notify_show_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('show_changes', json_build_object('operation', 'DELETE', 'id', OLD.id)::text);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM pg_notify('show_changes', json_build_object('operation', 'UPDATE', 'id', NEW.id)::text);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM pg_notify('show_changes', json_build_object('operation', 'INSERT', 'id', NEW.id)::text);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION notify_episode_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM pg_notify('episode_changes', json_build_object('operation', 'DELETE', 'id', OLD.id)::text);
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM pg_notify('episode_changes', json_build_object('operation', 'UPDATE', 'id', NEW.id)::text);
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM pg_notify('episode_changes', json_build_object('operation', 'INSERT', 'id', NEW.id)::text);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS shows_notify_trigger ON shows;
CREATE TRIGGER shows_notify_trigger
  AFTER INSERT OR UPDATE OR DELETE ON shows
  FOR EACH ROW
  EXECUTE FUNCTION notify_show_changes();

DROP TRIGGER IF EXISTS episodes_notify_trigger ON episodes;
CREATE TRIGGER episodes_notify_trigger
  AFTER INSERT OR UPDATE OR DELETE ON episodes
  FOR EACH ROW
  EXECUTE FUNCTION notify_episode_changes();