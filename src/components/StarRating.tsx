"use client";

import { Star } from "lucide-react";

interface StarRatingProps {
  rating: number;
  onRate?: (rating: number) => void;
  size?: number;
}

export default function StarRating({
  rating,
  onRate,
  size = 20,
}: StarRatingProps) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate?.(star)}
          disabled={!onRate}
          className={`transition-colors ${
            onRate ? "cursor-pointer hover:scale-110" : "cursor-default"
          }`}
        >
          <Star
            size={size}
            className={
              star <= rating
                ? "fill-yellow-400 text-yellow-400"
                : "fill-none text-gray-300"
            }
          />
        </button>
      ))}
    </div>
  );
}
