import { useEffect, useRef } from 'react';
import { useSocketContext } from '../context/SocketContext';

export const useSocketEvent = (event, callback) => {
  const socket = useSocketContext();
  const callbackRef = useRef(callback);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (socket) {
      // Use a stable wrapper that calls the current callback from the ref
      const handler = (...args) => {
        if (callbackRef.current) {
          callbackRef.current(...args);
        }
      };

      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    }
  }, [socket, event]);
};
