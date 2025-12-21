import { useState } from 'react';
import { actions } from 'astro:actions';

interface LikeButtonProps {
  sayingId: number;
  initialLiked: boolean;
  totalLikes: number;
  isAuthenticated: boolean;
  className?: string;
}

export default function LikeButton({
  sayingId,
  initialLiked,
  totalLikes,
  isAuthenticated,
  className = '',
}: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(totalLikes);
  const [isLoading, setIsLoading] = useState(false);

  const handleLikeToggle = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || isLoading) return;

    // Optimistic update
    const wasLiked = isLiked;
    const previousCount = likeCount;

    setIsLiked(!wasLiked);
    setLikeCount(wasLiked ? previousCount - 1 : previousCount + 1);
    setIsLoading(true);

    try {
      // Call server action
      const result = await actions.toggleLike({
        sayingId,
      });

      if (result.error) {
        throw new Error(result.error.message);
      }

      // Update to actual server state (in case it differs)
      if (result.data) {
        setIsLiked(result.data.liked);
      }
    } catch (error) {
      // Rollback on error
      console.error('Failed to toggle like:', error);
      setIsLiked(wasLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        <span className="ml-1">{likeCount}</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleLikeToggle}>
      <button
        type="submit"
        disabled={isLoading}
        className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-all ${
          isLiked
            ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
        } ${isLoading ? 'opacity-50 cursor-wait' : ''} ${className}`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={isLiked ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 transition-transform ${isLoading ? 'scale-90' : isLiked ? 'scale-110' : 'scale-100'}`}
          aria-hidden="true"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
        <span>{isLiked ? 'Liked' : 'Like'}</span>
        <span className="ml-1">({likeCount})</span>
      </button>
    </form>
  );
}
