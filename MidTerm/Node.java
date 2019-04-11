import java.net.InetAddress;

/**
 * This class models the Node entity, which is represented by an identifier (m
 * bits long), an IP address and a UDP port on which it is listening for
 * messages.
 * 
 * @author Lorenzo Bellomo
 *
 */
public class Node {

	/* Instance Variables*/
	
	private long identifier;
	@SuppressWarnings("unused")
	private InetAddress ipAddress;
	@SuppressWarnings("unused")
	private int udpPort;
	
	/* Constructors */

	/**
	 * Constructor, It generates a Node element with the loopback address and a fake UDP port
	 * 
	 * @param id
	 */
	public Node(long id) {
		ipAddress = InetAddress.getLoopbackAddress();
		identifier = id;
		udpPort = 0;
	}


	/* Getter and setter methods */
	
	/**
	 * Getter method for the Identifier Field
	 * @return the id of the Node
	 */
	public long getId() {
		return identifier;
	}

	/* Generic methods */
	
	/**
	 * Mock ping that simulates an Always on network with no churn
	 * @return always true
	 */
	public boolean ping() {
		return true;
	}

}
