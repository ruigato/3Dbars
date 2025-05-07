# me - this DAT.
# 
# dat - the changed DAT
# rows - a list of row indices
# cols - a list of column indices
# cells - the list of cells that have changed content
# prev - the list of previous string contents of the changed cells
# 
# Make sure the corresponding toggle is enabled in the DAT Execute DAT.
# 
# If rows or columns are deleted, sizeChange will be called instead of row/col/cellChange.


def onTableChange(dat):
    process_data()	
    return

def onRowChange(dat, rows):
	return

def onColChange(dat, cols):
	return

def onCellChange(dat, cells, prev):
	return

def onSizeChange(dat):
	return
	
# Data processor for Lion LED system

# Access to other components
points_dat = op('points')
primitives_dat = op('primitives')
vertices_dat = op('vertices') 


def process_data():
    # Main data processing function
    parse_csv_data()
    calculate_nose_position()
    calculate_distances()
    calculate_bar_positions()  # New function to calculate positions along bars
    update_results()  # Modified to update existing tables instead of creating new ones
    return

def parse_csv_data():
    # Parse points data
    global points, groups
    points = {}
    groups = {}
    
    # Skip header row
    for i in range(1, points_dat.numRows):
        row = points_dat.row(i)
        # Convert td.Cell objects to Python primitives
        idx = int(row[0].val)  # Use .val to get the actual value
        position = [float(row[1].val), float(row[2].val), float(row[3].val)]
        group_name = str(row[5].val)  # Convert to string explicitly
        
        # Store point data
        points[idx] = {
            'position': position,
            'group': group_name,
            'bar_id': None,       # Will be set later
            'bar_position': None  # Will be set later
        }
        
        # Organize by group
        if group_name not in groups:
            groups[group_name] = []
        groups[group_name].append(idx)
    
    # Parse primitives data
    global primitives
    primitives = {}
    
    for i in range(1, primitives_dat.numRows):
        row = primitives_dat.row(i)
        # Convert td.Cell objects to Python primitives
        idx = int(row[0].val)
        vertices_str = str(row[1].val)
        close = int(row[2].val)
        group_name = str(row[3].val)
        
        # Parse vertices list
        vertex_indices = [int(v) for v in vertices_str.split()]
        
        primitives[idx] = {
            'vertices': vertex_indices,
            'close': close,
            'group': group_name,
            'length': 0  # Will be calculated later
        }
    
    # Log results
    debug_log(f"Parsed {len(points)} points in {len(groups)} groups")
    debug_log(f"Parsed {len(primitives)} primitives")
    return

def calculate_nose_position():
    # Find the nose position (center of the 'nariz' group)
    global nose_position
    
    if 'nariz' in groups and groups['nariz']:
        # Calculate center of nariz group
        nariz_points = groups['nariz']
        positions = [points[idx]['position'] for idx in nariz_points]
        
        # Average position
        nose_position = [0, 0, 0]
        for pos in positions:
            nose_position[0] += pos[0]
            nose_position[1] += pos[1]
            nose_position[2] += pos[2]
        
        nose_position[0] /= len(positions)
        nose_position[1] /= len(positions)
        nose_position[2] /= len(positions)
    else:
        # Fallback if no nariz group
        debug_log("Warning: 'nariz' group not found")
        nose_position = [0, 0, 0]
    
    debug_log(f"Nose position: {nose_position}")
    return

def calculate_distances():
    # Calculate distance from nose for each point
    import math
    
    global min_distance, max_distance
    min_distance = float('inf')
    max_distance = 0
    
    for idx, point_data in points.items():
        pos = point_data['position']
        
        # Calculate Euclidean distance
        dx = pos[0] - nose_position[0]
        dy = pos[1] - nose_position[1]
        dz = pos[2] - nose_position[2]
        distance = math.sqrt(dx*dx + dy*dy + dz*dz)
        
        # Store in point data
        points[idx]['distance'] = distance
        
        # Track min/max for normalization
        min_distance = min(min_distance, distance)
        max_distance = max(max_distance, distance)
    
    # Calculate normalized distances
    distance_range = max_distance - min_distance
    for idx in points:
        raw_dist = points[idx]['distance']
        norm_dist = (raw_dist - min_distance) / distance_range
        points[idx]['normalized_distance'] = norm_dist
    
    debug_log(f"Distance range: {min_distance} to {max_distance}")
    return

def calculate_bar_positions():
    # Calculate position along bar for each point
    import math
    
    # Create a mapping from point ID to bar ID
    point_to_bar = {}
    
    # First, calculate bar lengths and assign bar IDs to points
    for bar_id, bar_data in primitives.items():
        vertices = bar_data['vertices']
        
        # Skip if there are not enough vertices
        if len(vertices) < 2:
            continue
        
        # Calculate total length of bar
        total_length = 0
        for i in range(1, len(vertices)):
            p1 = points[vertices[i-1]]['position']
            p2 = points[vertices[i]]['position']
            
            # Calculate segment length
            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            dz = p2[2] - p1[2]
            segment_length = math.sqrt(dx*dx + dy*dy + dz*dz)
            total_length += segment_length
        
        # Store the total length
        primitives[bar_id]['length'] = total_length
        
        # Assign bar ID to each point in this bar
        for vertex_idx in vertices:
            # A point may belong to multiple bars - for now we just take the last one
            point_to_bar[vertex_idx] = bar_id
    
    # Now calculate position along bar for each point
    for bar_id, bar_data in primitives.items():
        vertices = bar_data['vertices']
        total_length = bar_data['length']
        
        # Skip if the bar is too short
        if total_length < 0.001:
            continue
        
        # First vertex is at position 0
        points[vertices[0]]['bar_id'] = bar_id
        points[vertices[0]]['bar_position'] = 0.0
        
        # Calculate cumulative distance along the bar
        cumulative_length = 0
        for i in range(1, len(vertices)):
            p1 = points[vertices[i-1]]['position']
            p2 = points[vertices[i]]['position']
            
            # Calculate segment length
            dx = p2[0] - p1[0]
            dy = p2[1] - p1[1]
            dz = p2[2] - p1[2]
            segment_length = math.sqrt(dx*dx + dy*dy + dz*dz)
            
            # Add to cumulative length
            cumulative_length += segment_length
            
            # Calculate normalized position along bar (0 to 1)
            normalized_position = cumulative_length / total_length
            
            # Store in point data
            points[vertices[i]]['bar_id'] = bar_id
            points[vertices[i]]['bar_position'] = normalized_position
    
    # Normalize bar IDs to 0-1 range for texture mapping
    max_bar_id = max(primitives.keys()) if primitives else 0
    if max_bar_id > 0:
        for point in points.values():
            if point['bar_id'] is not None:
                point['normalized_bar_id'] = point['bar_id'] / max_bar_id
            else:
                point['normalized_bar_id'] = 0
    
    debug_log(f"Calculated bar positions for {len(point_to_bar)} points")
    return

def update_results():
    # Update existing tables instead of creating new ones
    
    # Update points_processed table with distances
    points_out = op('points_processed')
    if points_out:
        # Clear the table but preserve the header row
        header = []
        if points_out.numRows > 0:
            header = [cell.val for cell in points_out.row(0)]
        
        points_out.clear()
        
        # Check if we need to add our headers or use existing ones
        if not header or len(header) == 0:
            points_out.appendRow(['index', 'x', 'y', 'z', 'group', 'distance', 'norm_distance', 'bar_id', 'norm_bar_id', 'bar_position'])
        else:
            points_out.appendRow(header)
        
        # Add data
        for idx, point_data in points.items():
            pos = point_data['position']
            bar_id = point_data['bar_id'] if point_data['bar_id'] is not None else -1
            norm_bar_id = point_data['normalized_bar_id'] if 'normalized_bar_id' in point_data else 0
            bar_position = point_data['bar_position'] if point_data['bar_position'] is not None else 0
            
            row = [
                idx,
                pos[0],
                pos[1],
                pos[2],
                point_data['group'],
                point_data['distance'],
                point_data['normalized_distance'],
                bar_id,
                norm_bar_id,
                bar_position
            ]
            points_out.appendRow(row)
        
        debug_log(f"Updated points_processed table with {points_out.numRows - 1} rows")
    else:
        debug_log("Warning: points_processed table not found")
    
    # Update groups_info table
    groups_out = op('groups_info')
    if groups_out:
        # Clear the table but preserve the header row
        header = []
        if groups_out.numRows > 0:
            header = [cell.val for cell in groups_out.row(0)]
        
        groups_out.clear()
        
        # Check if we need to add our headers or use existing ones
        if not header or len(header) == 0:
            groups_out.appendRow(['group', 'count', 'min_dist', 'max_dist'])
        else:
            groups_out.appendRow(header)
        
        for group_name, indices in groups.items():
            if not indices:
                continue
            
            # Calculate group stats
            count = len(indices)
            group_min = min(points[idx]['normalized_distance'] for idx in indices)
            group_max = max(points[idx]['normalized_distance'] for idx in indices)
            
            groups_out.appendRow([group_name, count, group_min, group_max])
        
        debug_log(f"Updated groups_info table with {groups_out.numRows - 1} rows")
    else:
        debug_log("Warning: groups_info table not found")
    
    # Update primitives_info table
    primitives_out = op('primitives_info')
    if primitives_out:
        # Clear the table but preserve the header row
        header = []
        if primitives_out.numRows > 0:
            header = [cell.val for cell in primitives_out.row(0)]
        
        primitives_out.clear()
        
        # Check if we need to add our headers or use existing ones
        if not header or len(header) == 0:
            primitives_out.appendRow(['bar_id', 'group', 'vertex_count', 'length'])
        else:
            primitives_out.appendRow(header)
        
        for bar_id, bar_data in primitives.items():
            row = [
                bar_id,
                bar_data['group'],
                len(bar_data['vertices']),
                bar_data['length']
            ]
            primitives_out.appendRow(row)
        
        debug_log(f"Updated primitives_info table with {primitives_out.numRows - 1} rows")
    else:
        debug_log("Warning: primitives_info table not found")
    
    return

def debug_log(message):
    # Print to TextPort for debugging
    print(message)
    return