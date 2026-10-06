import { toast } from 'react-toastify';

type ToastType = 'error' | 'success' | 'info';

export function showToast(type: ToastType, fallback: string) {
  const message = fallback;

  switch (type) {
    case 'error':
      toast.error(message);
      break;
    case 'success':
      toast.success(message);
      break;
    case 'info':
      toast.info(message);
      break;
  }
}