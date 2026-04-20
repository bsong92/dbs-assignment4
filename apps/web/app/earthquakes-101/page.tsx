"use client";

export default function Earthquakes101() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Earthquakes 101</h1>
      <p className="text-gray-400 text-base mb-8">
        Understanding earthquake magnitudes, what to expect, and how to stay safe.
      </p>

      {/* Magnitude Scale */}
      <div className="bg-gray-900 rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">What Do Different Magnitudes Feel Like?</h2>

        <div className="space-y-6">
          {[
            {
              mag: "< 2.0",
              name: "Micro",
              color: "bg-gray-500",
              feeling: "Not felt by most people",
              impact: "No damage. Only detected by seismographs.",
              actions: "No action needed.",
            },
            {
              mag: "2.0 - 3.9",
              name: "Minor",
              color: "bg-green-500",
              feeling: "Often felt indoors, rarely outdoors",
              impact: "No structural damage. May rattle dishes and windows.",
              actions: "Stay calm. No immediate danger for most structures.",
            },
            {
              mag: "4.0 - 4.9",
              name: "Light",
              color: "bg-yellow-500",
              feeling: "Felt by most, many awakened at night",
              impact: "Minor damage possible. Furniture may shift. Windows may crack.",
              actions: "Take shelter. Move away from windows. Stay away from heavy objects.",
            },
            {
              mag: "5.0 - 5.9",
              name: "Moderate",
              color: "bg-orange-500",
              feeling: "Strong shaking. Felt by everyone.",
              impact: "Moderate damage. Buildings may suffer significant cracks. Chimneys may fall.",
              actions: "DROP, COVER, and HOLD ON. Move to interior walls. Avoid doorways.",
            },
            {
              mag: "6.0+",
              name: "Strong/Major",
              color: "bg-red-500",
              feeling: "Violent shaking. Hard to stand.",
              impact: "Severe damage. Many buildings destroyed. Landslides possible.",
              actions: "DROP, COVER, HOLD ON immediately. Get outside if safe. Avoid falling objects.",
            },
          ].map((level) => (
            <div key={level.mag} className="border-l-4 border-gray-700 pl-4 py-4">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-6 h-6 rounded ${level.color}`}></div>
                <h3 className="text-xl font-semibold text-white">
                  M{level.mag} — {level.name}
                </h3>
              </div>
              <div className="space-y-2 text-sm text-gray-300">
                <div>
                  <span className="font-medium text-gray-400">What you'll feel:</span> {level.feeling}
                </div>
                <div>
                  <span className="font-medium text-gray-400">What could happen:</span> {level.impact}
                </div>
                <div className="pt-2 bg-blue-900/30 rounded px-3 py-2 border border-blue-700">
                  <span className="font-medium text-blue-300">✓ What to do:</span> {level.actions}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Tips */}
      <div className="bg-gray-900 rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">🚨 What to Do During an Earthquake</h2>

        <div className="space-y-6">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
            <h3 className="text-xl font-bold text-red-300 mb-3">INDOORS (Most common scenario)</h3>
            <ol className="space-y-3 text-gray-300">
              <li className="flex gap-3">
                <span className="font-bold text-red-400 shrink-0">1.</span>
                <span>
                  <strong>DROP</strong> to your hands and knees immediately. Don't try to run.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-red-400 shrink-0">2.</span>
                <span>
                  <strong>COVER</strong> your head and neck under a sturdy desk, table, or against an interior wall.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-red-400 shrink-0">3.</span>
                <span>
                  <strong>HOLD ON</strong> and protect yourself until shaking stops (usually 20-60 seconds).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-orange-400 shrink-0">⚠️</span>
                <span>
                  <strong>DO NOT:</strong> Run outside (falling debris). Hide in doorways (not safer). Use elevators.
                </span>
              </li>
            </ol>
          </div>

          <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h3 className="text-xl font-bold text-blue-300 mb-3">OUTDOORS</h3>
            <ol className="space-y-3 text-gray-300">
              <li className="flex gap-3">
                <span className="font-bold text-blue-400 shrink-0">1.</span>
                <span>
                  Move away from buildings, power lines, and trees immediately.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-400 shrink-0">2.</span>
                <span>
                  Once in the open, stay there until shaking stops.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-blue-400 shrink-0">3.</span>
                <span>
                  Watch for falling debris, broken glass, and damaged power lines.
                </span>
              </li>
            </ol>
          </div>

          <div className="bg-green-900/20 border border-green-700 rounded-lg p-4">
            <h3 className="text-xl font-bold text-green-300 mb-3">IN A CAR</h3>
            <ol className="space-y-3 text-gray-300">
              <li className="flex gap-3">
                <span className="font-bold text-green-400 shrink-0">1.</span>
                <span>
                  Pull over safely (away from power lines and overpasses).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-green-400 shrink-0">2.</span>
                <span>
                  Stay in the vehicle with seatbelt fastened until shaking stops.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-bold text-green-400 shrink-0">3.</span>
                <span>
                  Watch for road damage before driving again.
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* After Earthquake */}
      <div className="bg-gray-900 rounded-xl p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">After the Earthquake Stops</h2>

        <div className="space-y-3 text-gray-300">
          <div className="flex gap-3">
            <span className="text-xl shrink-0">✓</span>
            <div>
              <strong>Check for injuries</strong> and provide first aid if needed.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">✓</span>
            <div>
              <strong>Inspect your home</strong> for gas leaks, electrical damage, and structural damage.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">✓</span>
            <div>
              <strong>Listen to emergency broadcasts</strong> for updates and warnings.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">✓</span>
            <div>
              <strong>Be prepared for aftershocks</strong> — smaller earthquakes that follow the main quake.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">✓</span>
            <div>
              <strong>Help others</strong> if you are able and safe to do so.
            </div>
          </div>
        </div>
      </div>

      {/* Before */}
      <div className="bg-gray-900 rounded-xl p-6">
        <h2 className="text-2xl font-bold mb-6">Before an Earthquake Happens</h2>

        <div className="space-y-3 text-gray-300">
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🏠</span>
            <div>
              <strong>Secure heavy furniture</strong> to walls (bookshelves, dressers).
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🚨</span>
            <div>
              <strong>Know safe spots</strong> in every room (under tables, against interior walls).
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🎒</span>
            <div>
              <strong>Keep an emergency kit</strong> ready (water, first aid, flashlight, radio, medications).
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">📱</span>
            <div>
              <strong>Have a communication plan</strong> with family or friends for after the earthquake.
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-xl shrink-0">🔍</span>
            <div>
              <strong>Learn about local hazards</strong> (tsunamis, landslides) if you live in an earthquake-prone area.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
