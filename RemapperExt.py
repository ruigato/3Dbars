"""
LED Bar Remapper Extension

This extension provides tools for remapping LED bar indices in a TouchDesigner network.
It helps match software bar indices with hardware bar indices and handles bar inversions.
"""

class LEDBarRemapper:
	"""
	LED Bar Remapper Extension
	"""
	
	def __init__(self, ownerComp):
		# Store the operator that owns this extension
		self.ownerComp = ownerComp
		
		# References to input tables (can be changed via parameters)
		self.points_table = op(self.ownerComp.par.Points.eval())
		self.primitives_table = op(self.ownerComp.par.Primitives.eval())
		self.vertices_table = op(self.ownerComp.par.Vertices.eval())
		
		# References to output tables - create them if they don't exist
		self.ensure_output_tables()
		
		# Initialize output tables with the input data
		self.initialize_tables()
		
		# Dictionary to store the mapping: {original_index: remapped_index}
		self.bar_mapping = {}
		
		# Log initialization
		self.log_message("LED Bar Remapper extension initialized")
	
	def ensure_output_tables(self):
		"""Create output tables if they don't exist"""
		# Get the parent network where we'll create the tables if needed
		parent_network = self.ownerComp.parent()
		
		# Points output table
		points_out_name = self.ownerComp.par.Pointsout.eval()
		self.points_out = op(points_out_name)
		if self.points_out is None:
			self.log_message(f"Creating points output table: {points_out_name}")
			self.points_out = parent_network.create(tableDAT, points_out_name)
		
		# Primitives output table
		primitives_out_name = self.ownerComp.par.Primitivesout.eval()
		self.primitives_out = op(primitives_out_name)
		if self.primitives_out is None:
			self.log_message(f"Creating primitives output table: {primitives_out_name}")
			self.primitives_out = parent_network.create(tableDAT, primitives_out_name)
		
		# Vertices output table
		vertices_out_name = self.ownerComp.par.Verticesout.eval()
		self.vertices_out = op(vertices_out_name)
		if self.vertices_out is None:
			self.log_message(f"Creating vertices output table: {vertices_out_name}")
			self.vertices_out = parent_network.create(tableDAT, vertices_out_name)
	
	def initialize_tables(self):
		"""Initialize output tables with input data"""
		if self.points_table and self.points_out:
			self.points_out.copy(self.points_table)
			self.log_message(f"Copied points table data ({self.points_table.numRows} rows)")
		else:
			self.log_message("Warning: Could not initialize points output table")
		
		if self.primitives_table and self.primitives_out:
			self.primitives_out.copy(self.primitives_table)
			self.log_message(f"Copied primitives table data ({self.primitives_table.numRows} rows)")
		else:
			self.log_message("Warning: Could not initialize primitives output table")
		
		if self.vertices_table and self.vertices_out:
			self.vertices_out.copy(self.vertices_table)
			self.log_message(f"Copied vertices table data ({self.vertices_table.numRows} rows)")
		else:
			self.log_message("Warning: Could not initialize vertices output table")
		
		self.log_message("Output tables initialized with input data")
	
	def reset_tables(self):
		"""Reset output tables to match original input tables"""
		self.initialize_tables()
		
		# Reset mapping
		self.bar_mapping = {}
		
		self.log_message("Output tables reset to original input values")
		return True
	
	def get_bar_vertices(self, bar_index):
		"""Get list of vertex indices for a specific bar"""
		# Check if the table exists
		if self.primitives_out is None:
			self.log_message("Error: Primitives output table is not available")
			return []
		
		# Primitives table contains the vertex indices for each bar
		for i in range(1, self.primitives_out.numRows):
			row = self.primitives_out.row(i)
			if int(row[0].val) == bar_index:
				# Parse the vertices string into a list of integers
				vertices_str = row[1].val
				return [int(v) for v in vertices_str.split()]
		
		self.log_message(f"Warning: Bar index {bar_index} not found in primitives table")
		return []
	
	def swap_bars(self, bar_index_1, bar_index_2):
		"""
		Swap two bar indices in all three tables
		
		Args:
			bar_index_1: First bar index to swap
			bar_index_2: Second bar index to swap
			
		Returns:
			bool: True if successful, False otherwise
		"""
		# Check if output tables exist
		if self.primitives_out is None or self.vertices_out is None:
			self.log_message("Error: Output tables are not available")
			return False
		
		if bar_index_1 == bar_index_2:
			self.log_message(f"Cannot swap bar {bar_index_1} with itself")
			return False
		
		self.log_message(f"Swapping bar {bar_index_1} with bar {bar_index_2}...")
		
		# Update mapping
		if bar_index_1 in self.bar_mapping:
			temp = self.bar_mapping[bar_index_1]
		else:
			temp = bar_index_1
			
		if bar_index_2 in self.bar_mapping:
			self.bar_mapping[bar_index_1] = self.bar_mapping[bar_index_2]
		else:
			self.bar_mapping[bar_index_1] = bar_index_2
			
		if bar_index_2 in self.bar_mapping:
			self.bar_mapping[bar_index_2] = temp
		else:
			self.bar_mapping[bar_index_2] = temp
		
		# Swap bars in primitives table
		self.swap_primitives_rows(bar_index_1, bar_index_2)
		
		# Get vertex indices for both bars
		vertices_1 = self.get_bar_vertices(bar_index_1)
		vertices_2 = self.get_bar_vertices(bar_index_2)
		
		# Swap vertices rows
		self.swap_vertices_rows(vertices_1, vertices_2)
		
		# Swap points rows (if needed - depends on implementation)
		# In some cases, points might not need swapping if they're referenced via vertices
		# But we'll include the method for completeness
		self.swap_points_rows(vertices_1, vertices_2)
		
		self.log_message(f"Successfully swapped bar {bar_index_1} with bar {bar_index_2}")
		return True
	
	def swap_primitives_rows(self, bar_index_1, bar_index_2):
		"""Swap rows in primitives table for two bar indices"""
		# Safety check
		if self.primitives_out is None:
			self.log_message("Error: Primitives output table is not available")
			return False
		
		row1_idx = None
		row2_idx = None
		
		# Find the row indices for the two bars
		for i in range(1, self.primitives_out.numRows):
			row = self.primitives_out.row(i)
			idx = int(row[0].val)
			
			if idx == bar_index_1:
				row1_idx = i
			elif idx == bar_index_2:
				row2_idx = i
		
		if row1_idx is None or row2_idx is None:
			self.log_message(f"Warning: Could not find both bar indices in primitives table")
			return False
		
		# Get data from both rows
		row1_data = []
		row2_data = []
		
		for j in range(self.primitives_out.numCols):
			row1_data.append(self.primitives_out[row1_idx, j].val)
			row2_data.append(self.primitives_out[row2_idx, j].val)
		
		# Swap the indices in the data
		row1_data[0] = bar_index_2
		row2_data[0] = bar_index_1
		
		# Update the rows
		for j in range(self.primitives_out.numCols):
			self.primitives_out[row1_idx, j] = row2_data[j]
			self.primitives_out[row2_idx, j] = row1_data[j]
		
		return True
	
	def swap_vertices_rows(self, vertices_1, vertices_2):
		"""
		Swap vertex references in vertices table.
		This is more complex as multiple rows may refer to the same bar.
		"""
		# Safety check
		if self.vertices_out is None:
			self.log_message("Error: Vertices output table is not available")
			return False
		
		# Create sets for faster lookup
		vertices_1_set = set(vertices_1)
		vertices_2_set = set(vertices_2)
		
		# Map of original vertex index to new vertex index
		vertex_mapping = {}
		
		# Create a mapping for each vertex
		for v1, v2 in zip(vertices_1, vertices_2):
			vertex_mapping[v1] = v2
			vertex_mapping[v2] = v1
		
		# Update vertices table based on mapping
		for i in range(1, self.vertices_out.numRows):
			row = self.vertices_out.row(i)
			index = int(row[0].val)
			vindex = int(row[1].val)
			
			# Check if this vertex needs remapping
			if vindex in vertex_mapping:
				self.vertices_out[i, 1] = vertex_mapping[vindex]
		
		return True
	
	def swap_points_rows(self, vertices_1, vertices_2):
		"""
		Swap points in the points table based on vertex indices.
		This may or may not be needed depending on your implementation.
		"""
		# In some implementations, points might not need swapping if 
		# they're referenced indirectly through vertices.
		# Include your implementation here if points need to be swapped.
		return True
	
	def invert_bar(self, bar_index):
		"""
		Invert the order of points within a single bar.
		This is useful when a bar is installed in the opposite direction.
		
		Args:
			bar_index: The index of the bar to invert
			
		Returns:
			bool: True if successful, False otherwise
		"""
		# Safety check
		if self.primitives_out is None:
			self.log_message("Error: Primitives output table is not available")
			return False
		
		self.log_message(f"Inverting point order for bar {bar_index}...")
		
		# Get the vertices for this bar
		vertices = self.get_bar_vertices(bar_index)
		
		if not vertices:
			self.log_message(f"Error: No vertices found for bar {bar_index}")
			return False
		
		# Verify we have the expected number of points (50)
		expected_points = int(self.ownerComp.par.Pointsperbar.eval())
		if len(vertices) != expected_points:
			self.log_message(f"Warning: Bar {bar_index} has {len(vertices)} points instead of the expected {expected_points}")
		
		# Find the row in primitives table for this bar
		primitive_row_idx = None
		for i in range(1, self.primitives_out.numRows):
			row = self.primitives_out.row(i)
			if int(row[0].val) == bar_index:
				primitive_row_idx = i
				break
				
		if primitive_row_idx is None:
			self.log_message(f"Error: Bar {bar_index} not found in primitives table")
			return False
		
		# Reverse the order of vertices in the primitives table
		# We need to modify the vertices string in column 1
		reversed_vertices = vertices[::-1]  # Reverse the list
		reversed_vertices_str = ' '.join(str(v) for v in reversed_vertices)
		
		# Update the primitives table with reversed vertices
		self.primitives_out[primitive_row_idx, 1] = reversed_vertices_str
		
		# Mark this bar as inverted in our mapping
		# Add a special flag to the mapping to indicate inversion
		if bar_index in self.bar_mapping:
			# If it's already in the mapping, we just toggle the inversion flag
			pass
		else:
			# If it's not in the mapping, we add it with an inversion flag
			self.bar_mapping[bar_index] = bar_index
		
		# Add a special indicator to track inversion
		if f"inverted_{bar_index}" in self.bar_mapping:
			# If it was already inverted, remove the inversion flag (double inversion = no inversion)
			del self.bar_mapping[f"inverted_{bar_index}"]
			self.log_message(f"Bar {bar_index} was already inverted, so it is now back to normal orientation")
		else:
			# Mark as inverted
			self.bar_mapping[f"inverted_{bar_index}"] = True
			self.log_message(f"Bar {bar_index} is now marked as inverted")
		
		self.log_message(f"Successfully inverted point order for bar {bar_index}")
		return True
	
	def invert_current_bar(self):
		"""
		Invert the order of points in the currently highlighted bar.
		Use this when a bar is lighting up in the reverse direction.
		"""
		# Get current bar index reference
		current_bar_chop = op(self.ownerComp.par.Currentbarindex.eval())
		
		# Safety check
		if current_bar_chop is None:
			self.log_message("Error: Current bar index CHOP not found")
			return False
		
		# Get current bar index value
		try:
			current_bar_index = int(current_bar_chop[0])
		except:
			self.log_message("Error: Could not get current bar index from CHOP")
			return False
		
		# Invert the current bar
		result = self.invert_bar(current_bar_index)
		
		if result:
			self.log_message(f"Inverted current bar {current_bar_index}")
		
		return result
	
	def swap_with_current(self, correct_bar_index):
		"""
		Swap the currently highlighted bar with the specified correct bar index.
		Use this when you find a mismatch.
		
		Args:
			correct_bar_index: The bar index that should be in the current position
		"""
		# Get current bar index reference
		current_bar_chop = op(self.ownerComp.par.Currentbarindex.eval())
		
		# Safety check
		if current_bar_chop is None:
			self.log_message("Error: Current bar index CHOP not found")
			return False
		
		# Get current bar index value
		try:
			current_bar_index = int(current_bar_chop[0])
		except:
			self.log_message("Error: Could not get current bar index from CHOP")
			return False
		
		if current_bar_index == correct_bar_index:
			self.log_message(f"Bar {current_bar_index} is already correct!")
			return False
		
		# Swap the bars
		result = self.swap_bars(current_bar_index, correct_bar_index)
		
		return result
	
	def apply_remapping(self):
		"""Apply the current mapping to the tables and print summary"""
		# This function doesn't need to do anything for separate output tables
		# since we've been directly modifying the output tables
		
		# Just print a summary of what was done
		self.log_message("Remapping complete. Summary of changes:")
		
		# Print bar swaps
		swaps = {k: v for k, v in self.bar_mapping.items() 
				if isinstance(k, int) and v != k and not isinstance(v, bool)}
		if swaps:
			self.log_message("Bar index swaps:")
			for orig, new in swaps.items():
				self.log_message(f"  Bar {orig} -> Bar {new}")
		
		# Print inversions
		inversions = [int(k.split('_')[1]) for k in self.bar_mapping.keys() 
					if isinstance(k, str) and k.startswith('inverted_')]
		if inversions:
			self.log_message("Inverted bars:")
			for bar in sorted(inversions):
				self.log_message(f"  Bar {bar}")
		
		if not swaps and not inversions:
			self.log_message("  No changes made")
			
		return True
	
	def log_message(self, message):
		"""Log a message to both the TouchDesigner textport and the extension's log field"""
		print(message)
		
		# Display the message in a text field if available
		log_field = self.ownerComp.op('log')
		if log_field:
			current_log = log_field.text
			log_field.text = current_log + "\n" + message