# me is this DAT.
# dat is the DAT that is cooking.
def onCook(dat):
    # Get position map data
    position_map = op('CreatePositionMap')
    
    # Determine dimensions 
    total_points = position_map.numRows - 1  # Subtract header row
    
    # Define group ID mapping
    group_ids = {
        "nariz": 1,
        "olhos": 2,
        "dentes": 3,
        "sobrancelhas": 4,
        "orelhas": 5,
        "bochechas": 6,
        "juba": 7
        # Add more groups as needed
    }
    
    # Clear the existing data
    dat.clear()
    
    # Create header row with channel names
    dat.appendRow(['r', 'g', 'b', 'a'])
    
    # Process each point
    for i in range(1, position_map.numRows):
        row = position_map.row(i)
        point_idx = int(row[0].val)
        angle = float(row[1].val)              # Store as red channel - normalized angle
        distance = float(row[2].val)           # Store as green channel - normalized distance
        
        # IMPORTANT CORRECTION: Get the integer bar ID directly from column 3
        # This is now the actual integer bar ID from the updated CreatePositionMap
        bar_id = int(row[3].val)               # Store actual integer bar ID in blue channel
        
        bar_position = float(row[4].val)       # Store as alpha channel - position along bar
        group_name = str(row[5].val).lower()   # Get actual group name
        
        # Get group ID (default to 0 if not found)
        group_id = group_ids.get(group_name, 0)
        
        # Each row becomes a sample in the CHOP
        # Format: R, G, B, A values
        # Using actual integer values for bar ID in blue channel
        dat.appendRow([angle, distance, bar_id, bar_position])
    
    print(f"Position map prepared with {dat.numRows-1} points using true integer bar IDs")
    
    # IMPORTANT: Make sure your DAT to TOP conversion uses 32-bit float format
    # This allows values outside the 0-1 range in the texture