import { createContext, ReactNode, useContext, useState } from "react";
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

  function setCartInLocalStorage(updatedCart: Product[]) {
    localStorage.setItem("@RocketShoes:cart", JSON.stringify(updatedCart));
  }

  const addProduct = async (productId: number) => {
    try {
      const {
        data: { id, image, price, title },
      } = await api.get(`/products/${productId}`);
      const {
        data: { amount },
      } = await api.get(`/stock/${productId}`);
      const hasProductInStock = amount > 1;

      if (!hasProductInStock) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const isAlreadyInCart = cart.find((product) => product.id === id);

      if (isAlreadyInCart) {
        setCart((prevState) => {
          const updatedCart = prevState.map((product) => {
            if (product.id === id) {
              return {
                ...product,
                amount: product.amount + 1,
              };
            }

            return product;
          });

          setCartInLocalStorage(updatedCart);
          return updatedCart;
        });
        return;
      }

      setCart((prevState) => {
        const updatedCart = [
          ...prevState,
          {
            amount: 1,
            id,
            image,
            price,
            title,
          },
        ];

        setCartInLocalStorage(updatedCart);
        return updatedCart;
      });
      return;
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isAlreadyInCart = cart.find((product) => product.id === productId);

      if (!isAlreadyInCart) {
        throw new Error();
      }

      setCart((prevState) => {
        const updatedCart = prevState.filter(
          (product) => product.id !== productId
        );

        setCartInLocalStorage(updatedCart);
        return updatedCart;
      });
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

      const {
        data: { amount: stockAmount },
      } = await api.get(`/stock/${productId}`);

      if (amount > stockAmount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      setCart((prevState) => {
        const updatedCart = prevState.map((product) => {
          if (product.id === productId) {
            return {
              ...product,
              amount,
            };
          }
          return product;
        });

        setCartInLocalStorage(updatedCart);
        return updatedCart;
      });
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
