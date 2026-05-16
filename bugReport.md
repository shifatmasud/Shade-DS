# Bug Report - Jelly GPGPU

## Resolved Issues
- **Skeleton Overhead**: Removed `WiggleBone` and `Skeleton` boilerplate.
- **Edge cases**: Fixed vertex-to-pixel mapping for non-power-of-two geometry counts.

## Open Issues
- **Self-Collision**: The GPGPU simulation doesn't currently handle internal volume preservation/self-collision (standard for vertex shaders).
- **Shadow Mapping**: Custom depth material required for accurate shadows with deformed vertices (to be implemented).
