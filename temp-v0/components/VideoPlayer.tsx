"use client"

export default function VideoPlayer() {
  return (
    <div className="aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
      <iframe
        src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"
        className="w-full h-full"
        title="DeedPro Product Demo"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
      />
    </div>
  )
}
