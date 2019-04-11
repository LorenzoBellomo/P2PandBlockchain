
import java.util.Scanner;

/**
 * Class that only interacts with the user to obtain the system wide parameters
 * and launches the coordinator lifecycle
 * 
 * @author loren
 *
 */
public class Main {

	public static void main(String[] args) {
		Scanner scanner = new Scanner(System.in);
		long m = 0, n = 0, k = 0;
		/*
		 * try {
		 * System.out.println("Please insert m (number of bits in the identifier): "); m
		 * = Long.parseLong(scanner.nextLine()); System.out.
		 * println("Please insert n (number of nodes that will join the network): "); n
		 * = Long.parseLong(scanner.nextLine());
		 * System.out.println("Please insert k (maximum size of the routing tables): ");
		 * k = Long.parseLong(scanner.nextLine()); } catch (NumberFormatException e) {
		 * System.out.println("ERROR: Unrecognized format"); System.exit(-1); }
		 */
		m = 3;
		n = 3;
		k = 1;

		Coordinator coordinator = new Coordinator(n, m, k);
		coordinator.createNetwork();

		scanner.close();

	}

}
