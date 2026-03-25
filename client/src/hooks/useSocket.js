import { useEffect } from 'react';
import { useSocketContext } from '../context/SocketContext';

export const useSocketEvent = (event, callback) => {
  const socket = useSocketContext();

  useEffect(() => {
    if (socket) {
      socket.on(event, callback);
      return () => {
        socket.off(event, callback);
      };
    }
  }, [socket, event, callback]);
};
