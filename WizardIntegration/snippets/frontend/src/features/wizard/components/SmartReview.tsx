'use client';
import React from 'react';
// TODO: wire to your real wizard store and routes
export default function SmartReview() {
  return (
    <section>
      <h2>Review</h2>
      <ul>
        <li><strong>Parties:</strong> John Smith → Smith Family Trust (dated 03/14/2020) <button>Edit</button></li>
        <li><strong>Property:</strong> 123 Main St • APN 123-456-789 <button>Edit</button></li>
        <li><strong>Vesting:</strong> Sole and Separate Property <button>Edit</button></li>
        <li><strong>Tax/Exemption:</strong> $0 (Interspousal exemption) <button>Edit</button></li>
      </ul>
    </section>
  );
}
