import { useEffect } from "react";
import { createContext, ReactNode, useContext, useRef, useState } from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find((product) => product.id === productId);

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const productStockAmount = stockResponse.data.amount;
      const productAmountInCart = productInCart ? productInCart.amount : 0;
      const productAmountToBuy = productAmountInCart + 1;

      if (productAmountToBuy > productStockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      if (productInCart) {
        setCart((prevState) =>
          prevState.map((product) => {
            if (product.id === productId) {
              return {
                ...product,
                amount: productAmountToBuy,
              };
            }
            return product;
          })
        );
      } else {
        const productResponse = await api.get(`/products/${productId}`);
        const { id, image, price, title } = productResponse.data;
        setCart((prevState) => [
          ...prevState,
          {
            amount: productAmountToBuy,
            id,
            image,
            price,
            title,
          },
        ]);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find((product) => product.id === productId);

      if (!productInCart) {
        throw new Error();
      }

      setCart((prevState) =>
        prevState.filter((product) => product.id !== productId)
      );
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return;
      }

      const stockResponse = await api.get<Stock>(`/stock/${productId}`);
      const productStockAmount = stockResponse.data.amount;

      if (amount > productStockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      setCart((prevState) =>
        prevState.map((product) => {
          if (product.id === productId) {
            return {
              ...product,
              amount,
            };
          }
          return product;
        })
      );
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
