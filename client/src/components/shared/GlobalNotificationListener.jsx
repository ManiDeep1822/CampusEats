import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { useSocketContext } from '../../context/SocketContext';
import { addNotification } from '../../store/notificationSlice';
import { toast } from 'react-hot-toast';

const GlobalNotificationListener = () => {
  const socket = useSocketContext();
  const dispatch = useDispatch();
  const location = useLocation();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  useEffect(() => {
    const registerPush = async () => {
      if ('serviceWorker' in navigator && isAuthenticated) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          
          // Re-subscribe if already granted to ensure sync with backend
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') return;

          let subscription = await registration.pushManager.getSubscription();

          if (!subscription) {
            const publicVapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || 'BP_nRlLWYFUrGD7CiEitqH8qiMrj1Ua0piy53ReYdzNkS9lthOugtOJ_XeMqBlSW95zLZQl8V5CNR4mIzdfk47Q';
            const convertedKey = urlBase64ToUint8Array(publicVapidKey);

            subscription = await registration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedKey
            });
          }

          // Send to backend - using native fetch to avoid redirect loop on 401
          const userInfo = JSON.parse(localStorage.getItem('userInfo'));
          if (userInfo?.token) {
            const API_BASE = import.meta.env.VITE_VAPID_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            await fetch(`${API_BASE}/auth/push/subscribe`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userInfo.token}` 
              },
              body: JSON.stringify(subscription)
            });
            console.log('Push Registered Successfully');
          }
        } catch (err) {
          console.error('Service Worker / Push subscription failed:', err);
        }
      }
    };

    if (isAuthenticated) {
      // Small delay to ensure localStorage/Redux sync
      const timer = setTimeout(registerPush, 2000);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user?.role]);

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  useEffect(() => {
    if (socket && isAuthenticated) {
      const handleNotification = (data, eventName) => {
        if (data && data.message) {
          let text = data.message;
          if (eventName === 'receive_message') {
            text = `💬 New chat from ${data.sender || 'Participant'}: ${data.message}`;

            // Check if user is already on a page containing the inline chat component
            const isRiderActive = user?.role === 'delivery'; // Riders only have one page
            const isStudentOnTracking = location.pathname.includes('/student/tracking');

            if (!isRiderActive && !isStudentOnTracking) {
              dispatch(addNotification({ message: text }));
              // Show Interactive Quick-Reply Chat Window only if browsing elsewhere
              toast.custom((t) => (
              <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-sm w-full bg-white shadow-2xl rounded-2xl pointer-events-auto flex flex-col ring-1 ring-black ring-opacity-5 overflow-hidden border border-gray-100`}>
                <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-primary flex items-center justify-center font-bold text-lg shadow-sm border border-orange-200">
                      {data.sender === 'Rider' ? '🛵' : '🎓'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{data.sender}</p>
                      <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Online Chat</p>
                    </div>
                  </div>
                  <button onClick={() => toast.dismiss(t.id)} className="text-gray-400 hover:text-gray-600 p-2 bg-white rounded-full shadow-sm hover:shadow transition border border-gray-100">
                     <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="p-4 pb-2 bg-white">
                  <div className="inline-block bg-gray-100 p-3 rounded-2xl rounded-tl-sm shadow-sm border border-gray-200">
                     <p className="text-sm text-gray-800">{data.message}</p>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1 ml-1">{new Date(data.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                </div>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if(!e.target.reply.value.trim() || !data.replyTo) return;
                    
                    const replyPacket = {
                      orderId: data.orderId,
                      to: data.replyTo,
                      replyTo: data.to,
                      message: e.target.reply.value,
                      sender: data.sender === 'Rider' ? 'Student' : 'Rider',
                      timestamp: Date.now()
                    };
                    
                    socket.emit('send_message', replyPacket);
                    toast.dismiss(t.id);
                    toast.success('Reply Sent Fast! 🚀', { duration: 3000 });
                  }}
                  className="p-3 border-t bg-gray-50 flex gap-2"
                >
                  <input name="reply" autoFocus autoComplete="off" type="text" placeholder={`Reply to ${data.sender}...`} className="flex-1 text-sm bg-white border border-gray-200 rounded-full px-4 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition shadow-sm" />
                  <button type="submit" className="bg-primary text-white w-10 h-10 rounded-full hover:bg-orange-600 transition shadow-md flex items-center justify-center"><svg className="w-4 h-4 translate-x-[1px] translate-y-[1px]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
                </form>
              </div>
            ), { duration: Infinity, position: 'bottom-right', id: `chat-${data.orderId}` });
            }
          } else {
             dispatch(addNotification({ message: text }));
             
             // Smart Toast Suppression:
             // Only show a toast if the user is NOT on the tracking page AND NOT on the student home (where the LiveTracker is).
             const isTrackingPage = location.pathname.includes('/student/tracking');
             const isStudentHome = location.pathname === '/student/home';
             const isOrderUpdate = eventName.startsWith('order:') || eventName === 'delivery:otp';

             if (!isOrderUpdate || (!isTrackingPage && !isStudentHome)) {
                toast(text, { icon: '🔔', duration: 4000 });
             }
          }
        }
      };

      const events = [
        'order:new',
        'order:confirmed',
        'order:preparing',
        'order:ready',
        'order:picked',
        'order:delivered',
        'order:cancelled',
        'delivery:otp',
        'receive_message'
      ];

      // Store handler refs locally in this effect's closure for perfect cleanup
      const boundHandlers = {};
      events.forEach(event => {
        const boundHandler = (data) => handleNotification(data, event);
        boundHandlers[event] = boundHandler;
        socket.on(event, boundHandler);
      });

      return () => {
        events.forEach(event => {
          socket.off(event, boundHandlers[event]);
        });
      };
    }
  }, [socket, isAuthenticated, dispatch, user?.role, location.pathname]);

  return null; // Invisible component
};

export default GlobalNotificationListener;
