// Human-readable message for any error, including ones with an empty .message.
// Example: when "localhost" resolves to both ::1 and 127.0.0.1 and both refuse
// the connection, Node throws an AggregateError whose own message is "" and
// the real reason (ECONNREFUSED) lives in err.errors[].
export function describeError(err) {
  if (!err) return 'Unknown error';
  if (err.message) return err.message;
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    return describeError(err.errors[0]);
  }
  return err.code || String(err) || 'Unknown error';
}
