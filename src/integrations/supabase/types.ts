export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          default_unit: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          default_unit?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          default_unit?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          gstin: string | null
          id: string
          mobile: string | null
          name: string
          notes: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          mobile?: string | null
          name: string
          notes?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          gstin?: string | null
          id?: string
          mobile?: string | null
          name?: string
          notes?: string | null
        }
        Relationships: []
      }
      inventory_lots: {
        Row: {
          cost_price: number | null
          created_at: string
          id: string
          lot_number: string | null
          product_id: string
          purchase_date: string | null
          quantity: number
          status: string
        }
        Insert: {
          cost_price?: number | null
          created_at?: string
          id?: string
          lot_number?: string | null
          product_id: string
          purchase_date?: string | null
          quantity?: number
          status?: string
        }
        Update: {
          cost_price?: number | null
          created_at?: string
          id?: string
          lot_number?: string | null
          product_id?: string
          purchase_date?: string | null
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          category_name: string | null
          gst_amount: number
          gst_percent: number
          id: string
          invoice_id: string
          original_rate: number
          price_overridden: boolean
          product_id: string | null
          product_name: string
          quantity: number
          rate: number
          unit: string
        }
        Insert: {
          amount: number
          category_name?: string | null
          gst_amount?: number
          gst_percent?: number
          id?: string
          invoice_id: string
          original_rate: number
          price_overridden?: boolean
          product_id?: string | null
          product_name: string
          quantity: number
          rate: number
          unit?: string
        }
        Update: {
          amount?: number
          category_name?: string | null
          gst_amount?: number
          gst_percent?: number
          id?: string
          invoice_id?: string
          original_rate?: number
          price_overridden?: boolean
          product_id?: string | null
          product_name?: string
          quantity?: number
          rate?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          customer_mobile: string | null
          customer_name: string | null
          discount_amount: number
          discount_type: string | null
          discount_value: number
          grand_total: number
          gst_amount: number
          id: string
          invoice_number: string
          payment_method: string
          price_type: string
          status: string
          subtotal: number
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          customer_mobile?: string | null
          customer_name?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number
          grand_total?: number
          gst_amount?: number
          id?: string
          invoice_number: string
          payment_method: string
          price_type?: string
          status?: string
          subtotal?: number
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          customer_mobile?: string | null
          customer_name?: string | null
          discount_amount?: number
          discount_type?: string | null
          discount_value?: number
          grand_total?: number
          gst_amount?: number
          id?: string
          invoice_number?: string
          payment_method?: string
          price_type?: string
          status?: string
          subtotal?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string | null
          category_id: string | null
          color: string | null
          created_at: string
          current_stock: number
          description: string | null
          gst_percent: number
          hsn_code: string | null
          id: string
          is_active: boolean
          min_stock: number
          name: string
          opening_stock: number
          pattern: string | null
          retail_rate: number
          sku: string
          unit: string
          updated_at: string
          wholesale_rate: number
        }
        Insert: {
          brand?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          gst_percent?: number
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name: string
          opening_stock?: number
          pattern?: string | null
          retail_rate?: number
          sku: string
          unit?: string
          updated_at?: string
          wholesale_rate?: number
        }
        Update: {
          brand?: string | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          current_stock?: number
          description?: string | null
          gst_percent?: number
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          min_stock?: number
          name?: string
          opening_stock?: number
          pattern?: string | null
          retail_rate?: number
          sku?: string
          unit?: string
          updated_at?: string
          wholesale_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          is_active?: boolean
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
        }
        Relationships: []
      }
      settings: {
        Row: {
          address: string | null
          allow_discount: boolean
          allow_negative_stock: boolean
          allow_price_override: boolean
          billing_can_discount: boolean
          billing_can_override: boolean
          business_name: string
          default_price_type: string
          email: string | null
          gst_enabled: boolean
          gst_inclusive: boolean
          gstin: string | null
          id: number
          invoice_footer: string | null
          invoice_prefix: string
          low_stock_alerts: boolean
          max_discount_amount: number
          max_discount_percent: number
          next_invoice_no: number
          payment_methods: string[]
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          allow_discount?: boolean
          allow_negative_stock?: boolean
          allow_price_override?: boolean
          billing_can_discount?: boolean
          billing_can_override?: boolean
          business_name?: string
          default_price_type?: string
          email?: string | null
          gst_enabled?: boolean
          gst_inclusive?: boolean
          gstin?: string | null
          id?: number
          invoice_footer?: string | null
          invoice_prefix?: string
          low_stock_alerts?: boolean
          max_discount_amount?: number
          max_discount_percent?: number
          next_invoice_no?: number
          payment_methods?: string[]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          allow_discount?: boolean
          allow_negative_stock?: boolean
          allow_price_override?: boolean
          billing_can_discount?: boolean
          billing_can_override?: boolean
          business_name?: string
          default_price_type?: string
          email?: string | null
          gst_enabled?: boolean
          gst_inclusive?: boolean
          gstin?: string | null
          id?: number
          invoice_footer?: string | null
          invoice_prefix?: string
          low_stock_alerts?: boolean
          max_discount_amount?: number
          max_discount_percent?: number
          next_invoice_no?: number
          payment_methods?: string[]
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_adjustments: {
        Row: {
          created_at: string
          direction: string
          id: string
          product_id: string
          quantity: number
          reason: string
          stock_after: number | null
          stock_before: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          direction: string
          id?: string
          product_id: string
          quantity: number
          reason: string
          stock_after?: number | null
          stock_before?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          direction?: string
          id?: string
          product_id?: string
          quantity?: number
          reason?: string
          stock_after?: number | null
          stock_before?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_stock: {
        Args: {
          _direction: string
          _product_id: string
          _quantity: number
          _reason: string
        }
        Returns: undefined
      }
      admin_set_user: {
        Args: {
          _is_active: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      can_manage_invoice: { Args: { _invoice_id: string }; Returns: boolean }
      cancel_invoice: {
        Args: { _invoice_id: string; _reason: string }
        Returns: undefined
      }
      create_invoice: {
        Args: {
          _customer_id: string
          _customer_mobile: string
          _customer_name: string
          _discount_type: string
          _discount_value: number
          _items: Json
          _payment_method: string
          _price_type: string
        }
        Returns: string
      }
      delete_invoice: { Args: { _invoice_id: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_active_user: { Args: { _user_id: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      is_staff: { Args: never; Returns: boolean }
      update_invoice_details: {
        Args: {
          _customer_mobile: string
          _customer_name: string
          _invoice_id: string
          _payment_method: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "billing"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "billing"],
    },
  },
} as const
