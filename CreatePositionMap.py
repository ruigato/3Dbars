# me is this DAT.
# dat is the DAT that is cooking.
import math

def onCook(dat):
    # Access data
    data_base = op('/LionData')
    points_table = data_base.op('points_processed')
    
    # Find nose center
    nose_x, nose_y, nose_z = 0, 0, 0
    nose_count = 0
    
    for i in range(1, points_table.numRows):
        row = points_table.row(i)
        if str(row[4].val).lower() == 'nariz':
            nose_x += float(row[1].val)
            nose_y += float(row[2].val)
            nose_z += float(row[3].val)
            nose_count += 1
    
    if nose_count > 0:
        nose_x /= nose_count
        nose_y /= nose_count
        nose_z /= nose_count
    
    # Create a table for the position map
    # Format: point_idx, normalized_angle, normalized_distance, bar_id, bar_position, group
    dat.clear()
    dat.appendRow(['idx', 'angle', 'distance', 'bar_id', 'bar_position', 'group'])
    
    # Calculate for each point
    for i in range(1, points_table.numRows):
        row = points_table.row(i)
        point_idx = int(row[0].val)
        x = float(row[1].val)
        y = float(row[2].val)
        z = float(row[3].val)
        group = str(row[4].val)
        distance = float(row[6].val)  # already normalized
        
        # Get bar information from the updated points_processed table
        # IMPORTANT: Use the actual integer bar_id from column 7 instead of normalized bar_id
        bar_id = int(row[7].val) if len(row) > 7 else 0  # Integer bar ID from column 7
        bar_position = float(row[9].val) if len(row) > 9 else 0.0  # Position along bar
        
        # Calculate angle from nose
        rel_x = x - nose_x
        rel_z = z - nose_z
        
        # Calculate angle in XZ plane (assuming Y is up)
        angle = math.atan2(rel_z, rel_x)
        # Normalize angle to 0-1 range
        angle_norm = (angle + math.pi) / (2.0 * math.pi)
        
        # Store the mapping with all data, using integer bar_id
        dat.appendRow([
            point_idx, 
            angle_norm, 
            distance, 
            bar_id, 
            bar_position, 
            group
        ])
    
    # Note: This is raw data, not a proper texture yet
    print(f"Position map created with {dat.numRows-1} points, using integer bar IDs")