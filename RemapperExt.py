"""
LED Bar Remapper Extension

Esta extensão fornece ferramentas para remapear índices de barras de LEDs
num network TouchDesigner. Ajuda a sincronizar índices de software com o
hardware e a tratar inversões de barras.
"""

class LEDBarRemapper:
    def __init__(self, ownerComp):
        # Operador que detém esta extensão
        self.ownerComp        = ownerComp
        # Tabelas de input (definidas pelos parâmetros)
        self.points_table     = op(self.ownerComp.par.Points.eval())
        self.primitives_table = op(self.ownerComp.par.Primitives.eval())
        self.vertices_table   = op(self.ownerComp.par.Vertices.eval())
        # Cria ou referencia as tabelas de output
        self.ensure_output_tables()
        # Inicializa as tabelas de output com os dados de input
        self.initialize_tables()
        # Mapeamento de trocas e inversões
        self.bar_mapping      = {}
        # Initialize the mapping table for visualization
        self.update_mapping_table()
        self.log_message("LED Bar Remapper extension initialized")

    def ensure_output_tables(self):
        """Cria as DATs de output se não existirem."""
        parent = self.ownerComp.parent()
        # points_out
        name = self.ownerComp.par.Pointsout.eval()
        self.points_out = op(name) or parent.create(tableDAT, name)
        # primitives_out
        name = self.ownerComp.par.Primitivesout.eval()
        self.primitives_out = op(name) or parent.create(tableDAT, name)
        # vertices_out
        name = self.ownerComp.par.Verticesout.eval()
        self.vertices_out = op(name) or parent.create(tableDAT, name)
        # mapping table for shader visualization
        name = "BarMappingTable"
        self.mapping_table = op(name) or parent.create(tableDAT, name)

    def initialize_tables(self):
        """Copia os dados das tabelas de input para as de output."""
        if self.points_table and self.points_out:
            self.points_out.copy(self.points_table)
        if self.primitives_table and self.primitives_out:
            self.primitives_out.copy(self.primitives_table)
        if self.vertices_table and self.vertices_out:
            self.vertices_out.copy(self.vertices_table)
        self.log_message("Output tables initialized")

    def update_mapping_table(self):
        """Update the mapping table for shader visualization"""
        # Find the table operator
        if not self.mapping_table:
            self.log_message("Error: BarMappingTable not found")
            return False
        
        # Clear the table
        self.mapping_table.clear()
        
        # Add header row
        self.mapping_table.appendRow(['orig_id', 'remapped_id', 'is_inverted'])
        
        # Fill table with all bar IDs (0 to total_bars-1)
        total_bars = int(self.ownerComp.par.Totalbars.eval())
        
        for i in range(total_bars):
            # Get remapped ID (use original if not mapped)
            if i in self.bar_mapping and isinstance(self.bar_mapping[i], int):
                remapped_id = self.bar_mapping[i]
            else:
                remapped_id = i
            
            # Check if inverted
            inversion_key = f"inverted_{i}"
            is_inverted = 1 if inversion_key in self.bar_mapping else 0
            
            # Add row
            self.mapping_table.appendRow([i, remapped_id, is_inverted])
        
        self.log_message(f"Updated mapping table with {total_bars} bars")
        return True

    def reset_tables(self):
        """Reverte as tabelas de output aos valores originais."""
        self.initialize_tables()
        self.bar_mapping = {}
        # Update mapping table after resetting
        self.update_mapping_table()
        self.log_message("Output tables reset to original input values")
        return True

    def log_message(self, msg):
        """Imprime no Textport e adiciona ao campo 'log' se existir."""
        print(msg)
        fld = self.ownerComp.op('log')
        if fld:
            fld.text += "\n" + msg

    def get_bar_vertices(self, bar_index):
        """Devolve a lista de índices de vértice para uma dada barra."""
        if not self.primitives_out:
            self.log_message("Error: primitives_out missing")
            return []
        for i in range(1, self.primitives_out.numRows):
            if int(self.primitives_out[i,0].val) == bar_index:
                return [int(v) for v in self.primitives_out[i,1].val.split()]
        self.log_message(f"Warning: Bar {bar_index} not found in primitives")
        return []

    def swap_bars(self, b1, b2):
        """
        Troca duas barras em todas as tabelas (primitives, vertices, points).
        """
        if not self.primitives_out or not self.vertices_out:
            self.log_message("Error: tabelas não disponíveis")
            return False
        if b1 == b2:
            self.log_message("Não se pode trocar a mesma barra")
            return False

        self.log_message(f"Swapping bar {b1} ⇄ {b2}")
        # Atualiza mapeamento
        temp = self.bar_mapping.get(b1, b1)
        self.bar_mapping[b1] = self.bar_mapping.get(b2, b2)
        self.bar_mapping[b2] = temp

        # 1) primitives
        self.swap_primitives_rows(b1, b2)
        # 2) vertices
        v1 = self.get_bar_vertices(b1)
        v2 = self.get_bar_vertices(b2)
        self.swap_vertices_rows(v1, v2)
        # 3) points
        self.swap_points_rows(v1, v2)
        
        # Update mapping table after change
        self.update_mapping_table()

        self.log_message("Swap completo")
        return True

    def swap_primitives_rows(self, b1, b2):
        """Troca as linhas correspondentes a duas barras na tabela de primitives."""
        i1 = i2 = None
        for i in range(1, self.primitives_out.numRows):
            idx = int(self.primitives_out[i,0].val)
            if idx == b1:
                i1 = i
            elif idx == b2:
                i2 = i
            if i1 is not None and i2 is not None:
                break
        if i1 is None or i2 is None:
            self.log_message("Aviso: barras não encontradas em primitives")
            return False
        # Guarda dados
        d1 = [self.primitives_out[i1,c].val for c in range(self.primitives_out.numCols)]
        d2 = [self.primitives_out[i2,c].val for c in range(self.primitives_out.numCols)]
        # Troca índices e conteúdo
        d1[0], d2[0] = str(b2), str(b1)
        for c in range(self.primitives_out.numCols):
            self.primitives_out[i1,c] = d2[c]
            self.primitives_out[i2,c] = d1[c]
        return True

    def swap_vertices_rows(self, v1, v2):
        """
        Troca referências de vértice na tabela de vertices
        com base nos pares (v1[i], v2[i]).
        """
        if not self.vertices_out:
            self.log_message("Error: vertices_out missing")
            return False
        m = {a:b for a,b in zip(v1,v2)}
        m.update({b:a for a,b in zip(v1,v2)})
        for i in range(1, self.vertices_out.numRows):
            vid = int(self.vertices_out[i,1].val)
            if vid in m:
                self.vertices_out[i,1] = m[vid]
        return True

    def swap_points_rows(self, v1, v2):
        """
        Troca as linhas na tabela de points para duas listas de vértices
        correspondentes a barras diferentes.
        """
        if not self.points_out:
            self.log_message("Error: points_out missing")
            return False
        for a, b in zip(v1, v2):
            r1 = r2 = None
            # encontra linhas
            for i in range(1, self.points_out.numRows):
                try:
                    vid = int(self.points_out[i,0].val)
                except ValueError:
                    continue
                if vid == a:
                    r1 = i
                elif vid == b:
                    r2 = i
                if r1 is not None and r2 is not None:
                    break
            if r1 is None or r2 is None:
                self.log_message(f"Aviso: não encontrou vértices {a} ou {b}")
                continue
            # troca conteudos
            d1 = [self.points_out[r1,c].val for c in range(self.points_out.numCols)]
            d2 = [self.points_out[r2,c].val for c in range(self.points_out.numCols)]
            for c in range(self.points_out.numCols):
                self.points_out[r1,c] = d2[c]
                self.points_out[r2,c] = d1[c]
        return True

    def invert_bar(self, bar_index):
        """
        Inverte a ordem dos pontos de uma barra tanto em primitives
        como reordena completamente na tabela de points.
        """
        if not self.primitives_out:
            self.log_message("Error: primitives_out missing")
            return False

        # 1) Inverte em primitives
        row = None
        for i in range(1, self.primitives_out.numRows):
            if int(self.primitives_out[i,0].val) == bar_index:
                row = i
                break
        if row is None:
            self.log_message(f"Erro: barra {bar_index} não encontrada")
            return False

        vertices = [int(v) for v in self.primitives_out[row,1].val.split()]
        rev = vertices[::-1]
        self.primitives_out[row,1] = ' '.join(str(x) for x in rev)

        # 2) Reordena blocos na tabela de points
        self.invert_points_rows(vertices)

        # 3) Marca/Desmarca inversão
        key = f"inverted_{bar_index}"
        if key in self.bar_mapping:
            del self.bar_mapping[key]
            self.log_message(f"Bar {bar_index} voltou ao normal")
        else:
            self.bar_mapping[key] = True
            self.log_message(f"Bar {bar_index} marcada como invertida")
            
        # Update mapping table after inversion
        self.update_mapping_table()

        self.log_message(f"Inversão completa para barra {bar_index}")
        return True

    def invert_points_rows(self, vertices):
        """
        Dado um bloco de vértices, recolhe todas as linhas correspondentes
        e escreve-as de volta em ordem inversa.
        """
        if not self.points_out:
            self.log_message("Error: points_out missing")
            return False

        # Recolhe (linha, dados) para cada vértice
        linhas = []
        for vid in vertices:
            for i in range(1, self.points_out.numRows):
                if int(self.points_out[i,0].val) == vid:
                    dados = [self.points_out[i,c].val for c in range(self.points_out.numCols)]
                    linhas.append((i, dados))
                    break

        if len(linhas) != len(vertices):
            self.log_message("Aviso: número de vértices encontrados não corresponde")
            return False

        # Extrai índices e dados, inverte dados e reescreve
        idxs, dados = zip(*linhas)
        dados_rev = dados[::-1]
        for row_idx, row_data in zip(idxs, dados_rev):
            for c in range(self.points_out.numCols):
                self.points_out[row_idx,c] = row_data[c]

        return True

    def invert_current_bar(self):
        """Inverte a barra definida no CurrentBarIndex CHOP."""
        chop = op(self.ownerComp.par.Currentbarindex.eval())
        if not chop:
            self.log_message("Error: Current bar index CHOP not found")
            return False
        try:
            idx = int(chop[0])
        except:
            self.log_message("Error: não foi possível ler o índice da barra atual")
            return False
        return self.invert_bar(idx)

    def swap_with_current(self, correct_bar_index):
        """
        Troca a barra atual (CurrentBarIndex) com o índice correto fornecido.
        """
        chop = op(self.ownerComp.par.Currentbarindex.eval())
        if not chop:
            self.log_message("Error: Current bar index CHOP not found")
            return False
        try:
            cur = int(chop[0])
        except:
            self.log_message("Error: não foi possível ler o índice da barra atual")
            return False
        if cur == correct_bar_index:
            self.log_message(f"Bar {cur} já está correta")
            return False
        return self.swap_bars(cur, correct_bar_index)

    def apply_remapping(self):
        """Imprime um resumo das trocas e inversões efetuadas."""
        # Update mapping table to ensure it's current
        self.update_mapping_table()
        
        self.log_message("Remapping complete. Summary of changes:")
        # Trocas
        swaps = {k: v for k, v in self.bar_mapping.items()
                 if isinstance(k, int) and v != k}
        if swaps:
            self.log_message("Bar index swaps:")
            for o, n in swaps.items():
                self.log_message(f"  Bar {o} -> Bar {n}")
        # Inversões
        inversions = [int(k.split('_')[1]) for k in self.bar_mapping
                      if isinstance(k, str) and k.startswith('inverted_')]
        if inversions:
            self.log_message("Inverted bars:")
            for b in sorted(inversions):
                self.log_message(f"  Bar {b}")
        if not swaps and not inversions:
            self.log_message("  No changes made")
        return True