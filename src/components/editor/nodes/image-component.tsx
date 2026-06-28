import { useState } from 'react';

type ImageComponentProps = {
  altText: string;
  height: 'inherit' | number;
  maxWidth: number;
  src: string;
  width: 'inherit' | number;
};

function BrokenImage() {
  return (
    <div className="flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 p-8 dark:border-slate-700 dark:bg-slate-800">
      <div className="text-center">
        <svg
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-600"
        >
          <path
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Image failed to load</p>
      </div>
    </div>
  );
}

function LazyImage({ altText, height, maxWidth, src, width }: ImageComponentProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return <BrokenImage />;
  }

  return (
    <img
      src={src}
      alt={altText}
      loading="lazy"
      draggable={false}
      className="h-auto max-w-full rounded-lg"
      onError={() => {
        return setHasError(true);
      }}
      style={{
        height: height === 'inherit' ? 'auto' : `${height}px`,
        maxWidth: `${maxWidth}px`,
        width: width === 'inherit' ? '100%' : `${width}px`,
      }}
    />
  );
}

export default function ImageComponent(props: ImageComponentProps) {
  return (
    <div className="relative my-4">
      <LazyImage {...props} />
    </div>
  );
}
