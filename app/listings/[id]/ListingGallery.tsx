"use client";

import Image from "next/image";
import { useState } from "react";

type ListingGalleryProps = {
  title: string;
  images: string[];
};

export default function ListingGallery({ title, images }: ListingGalleryProps) {
  const [activeImage, setActiveImage] = useState(images[0] || "");

  if (images.length === 0) {
    return (
      <div className="mt-8 flex h-80 items-center justify-center rounded-[1.75rem] border border-[#D6B56D]/20 bg-[#D8EFEC] text-sm font-semibold text-[#0B3C5D]/70">
        Premium gallery photos coming soon
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-[#D6B56D]">
            Premium gallery
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#0B3C5D]">
            View every detail.
          </h2>
        </div>
        <p className="text-sm font-semibold text-[#0B3C5D]/70">
          {images.length} photo{images.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_180px]">
        <div className="group relative min-h-[360px] overflow-hidden rounded-[1.75rem] bg-[#D8EFEC] shadow-2xl shadow-[#071F2F]/10 sm:min-h-[560px]">
          <Image
            src={activeImage}
            alt={title}
            fill
            sizes="(min-width: 1024px) 60vw, 100vw"
            unoptimized
            className="object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,rgba(7,31,47,0)_0%,rgba(7,31,47,0.7)_100%)]" />
        </div>
        {images.length > 1 ? (
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1">
            {images.map((imageUrl, index) => (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                aria-label={`Show ${title} photo ${index + 1}`}
                onClick={() => setActiveImage(imageUrl)}
                className={`group relative h-24 overflow-hidden rounded-[1rem] bg-[#D8EFEC] ring-offset-2 transition hover:-translate-y-0.5 lg:h-[126px] ${
                  activeImage === imageUrl
                    ? "ring-4 ring-[#00A8A8]"
                    : "ring-1 ring-gray-200"
                }`}
              >
                <Image
                  src={imageUrl}
                  alt={`${title} photo ${index + 1}`}
                  fill
                  sizes="160px"
                  unoptimized
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
