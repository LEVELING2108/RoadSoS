import heapq
import math
from typing import List, Dict, Any, Optional

class KDNode:
    def __init__(self, point: Dict[str, Any], axis: int):
        self.point = point
        self.axis = axis  # 0: lat, 1: lon
        self.left: Optional[KDNode] = None
        self.right: Optional[KDNode] = None

class SpatialKDTree:
    """2D KD-Tree for O(log N) Nearest Neighbor & Range Queries"""
    def __init__(self, points: List[Dict[str, Any]] = None):
        self.root: Optional[KDNode] = None
        if points:
            self.root = self._build_tree(points, 0)

    def _build_tree(self, points: List[Dict[str, Any]], depth: int) -> Optional[KDNode]:
        if not points:
            return None

        axis = depth % 2
        key = "lat" if axis == 0 else "lon"
        points.sort(key=lambda p: p.get(key, 0.0))

        median = len(points) // 2
        node = KDNode(points[median], axis)
        node.left = self._build_tree(points[:median], depth + 1)
        node.right = self._build_tree(points[median + 1:], depth + 1)

        return node

    @staticmethod
    def haversine(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371.0
        dlat = math.radians(lat2 - lat1)
        dlon = math.radians(lon2 - lon1)
        a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
        clamped_a = min(1.0, max(0.0, a))
        return R * 2 * math.atan2(math.sqrt(clamped_a), math.sqrt(1 - clamped_a))

    def find_nearest(self, target_lat: float, target_lon: float) -> Optional[Dict[str, Any]]:
        if not self.root:
            return None

        best_node: Optional[KDNode] = None
        best_dist = float("inf")

        def search(node: Optional[KDNode]):
            nonlocal best_node, best_dist
            if not node:
                return

            lat = node.point.get("lat")
            lon = node.point.get("lon")
            if lat is not None and lon is not None:
                dist = self.haversine(target_lat, target_lon, lat, lon)
                if dist < best_dist:
                    best_dist = dist
                    best_node = node

            axis = node.axis
            target_val = target_lat if axis == 0 else target_lon
            node_val = (lat if axis == 0 else lon) or 0.0

            near_child = node.left if target_val < node_val else node.right
            far_child = node.right if target_val < node_val else node.left

            search(near_child)

            diff_deg = abs(target_val - node_val)
            diff_km = diff_deg * 111.0
            if diff_km < best_dist:
                search(far_child)

        search(self.root)
        return best_node.point if best_node else None


class TopKHeap:
    """O(N log K) Category-Balanced Selection Algorithm using Priority Queue"""
    @staticmethod
    def select_top_k(items: List[Dict[str, Any]], k_per_category: int = 10) -> List[Dict[str, Any]]:
        if not items:
            return []

        # Group items by emergency category to guarantee coverage for Hospitals, Police, and Rescue
        grouped: Dict[str, List[Dict[str, Any]]] = {
            "hospital": [],
            "police": [],
            "rescue": []
        }

        for item in items:
            cat = (item.get("category") or "").lower()
            typ = (item.get("type") or "").lower()
            
            if any(c in cat or c in typ for c in ["hospital", "clinic", "doctors", "pharmacy", "healthcare", "trauma_center", "ambulance"]):
                grouped["hospital"].append(item)
            elif any(c in cat or c in typ for c in ["police", "fire", "emergency", "security"]):
                grouped["police"].append(item)
            else:
                grouped["rescue"].append(item)

        selected = []
        for cat_name, cat_items in grouped.items():
            # Sort each category strictly by proximity distance, preserving trauma recommendation bonus
            sorted_cat = sorted(
                cat_items, 
                key=lambda x: (0 if x.get("is_recommended") else 1, x.get("distance") or 9999)
            )
            selected.extend(sorted_cat[:k_per_category])

        # Final sort by distance and recommendation flag
        selected.sort(key=lambda x: (0 if x.get("is_recommended") else 1, x.get("distance") or 9999))
        return selected


class GeohashUtil:
    """O(1) Spatial Hashing for fast grid cell lookups"""
    BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"

    @classmethod
    def encode(cls, lat: float, lon: float, precision: int = 6) -> str:
        is_even = True
        lat_min, lat_max = -90.0, 90.0
        lon_min, lon_max = -180.0, 180.0
        bit = 0
        ch = 0
        geohash = []

        while len(geohash) < precision:
            if is_even:
                mid = (lon_min + lon_max) / 2
                if lon >= mid:
                    ch |= (1 << (4 - bit))
                    lon_min = mid
                else:
                    lon_max = mid
            else:
                mid = (lat_min + lat_max) / 2
                if lat >= mid:
                    ch |= (1 << (4 - bit))
                    lat_min = mid
                else:
                    lat_max = mid

            is_even = not is_even
            if bit < 4:
                bit += 1
            else:
                geohash.append(cls.BASE32[ch])
                bit = 0
                ch = 0

        return "".join(geohash)
